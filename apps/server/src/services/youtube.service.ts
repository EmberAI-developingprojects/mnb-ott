import axios from "axios";
import { redis } from "../lib/redis";

const YT = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.YOUTUBE_API_KEY!;
const PLAYLIST_ID = process.env.MNB_YOUTUBE_CHANNEL_ID!.replace("UC", "UU");
const CACHE_TTL = 30 * 60; // 30 минут

export interface YtVideo {
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: number;      
  viewCount: number;
  channelTitle: string;
}

export type Genre = "Мэдээ" | "Нэвтрүүлэг" | "Хүүхэд" | "Спорт" | "Баримтат" | "Бусад";

export interface YtShow {
  slug: string;
  name: string;
  thumbnailUrl: string;
  episodeCount: number;
  latestDate: string;
  latestId: string;
  genre: Genre;
}

export function detectGenre(showName: string, fullTitle: string): Genre {
  const t = (showName + " " + fullTitle).toLowerCase();

  // Хүүхэд
  if (t.includes("хүүхэд") || t.includes("жив жив") || t.includes("бяцхан") || t.includes("казка")) return "Хүүхэд";
  // Спорт
  if (t.includes("спорт") || t.includes("тэмцээн") || t.includes("чемпионат") || t.includes("лиг") || t.includes("уралдаан")) return "Спорт";
  // Баримтат
  if (t.includes("баримт") || t.includes("documentary") || t.includes("түүх") || t.includes("дурсамж")) return "Баримтат";
  // Мэдээ — "мэдээ" гэсэн үг standalone байгаа буюу "мэдэ" биш
  if (/\bмэдээ\b/.test(t) && !t.includes("мэдээллийн")) return "Мэдээ";
  if (t.includes("мэдлэг") || t.includes("танин")) return "Нэвтрүүлэг";
  // Нэвтрүүлэг — мэдээллийн хөтөлбөр, нэвтрүүлэг, хөтөлбөр, тойм г.м.
  if (
    t.includes("нэвтрүүлэг") ||
    t.includes("мэдээллийн") ||
    t.includes("хөтөлбөр") ||
    t.includes("долоо хоног") ||
    t.includes("тойм") ||
    t.includes("парламент") ||
    t.includes("цаг уур") ||
    t.includes("ярилцлага")
  ) return "Нэвтрүүлэг";
  return "Бусад";
}

export interface YtListResult {
  videos: YtVideo[];
  nextPageToken?: string;
  totalResults: number;
}

// ISO 8601 duration → секунд
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
}

// playlistItems.list → videoId жагсаалт (1 quota unit)
async function fetchPlaylistItems(
  pageToken?: string,
  maxResults = 50
): Promise<{ ids: string[]; nextPageToken?: string; totalResults: number }> {
  const { data } = await axios.get(`${YT}/playlistItems`, {
    params: {
      part: "contentDetails",
      playlistId: PLAYLIST_ID,
      maxResults,
      pageToken,
      key: KEY,
    },
  });

  return {
    ids: data.items.map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId),
    nextPageToken: data.nextPageToken,
    totalResults: data.pageInfo.totalResults,
  };
}

// videos.list → title, duration, stats (1 quota unit, max 50 IDs)
async function fetchVideoDetails(ids: string[]): Promise<YtVideo[]> {
  if (ids.length === 0) return [];

  const { data } = await axios.get(`${YT}/videos`, {
    params: {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
      key: KEY,
    },
  });

  return data.items
    .filter((item: { status?: { privacyStatus: string } }) => item.status?.privacyStatus !== "private")
    .map((item: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string } };
        publishedAt: string;
        channelTitle: string;
      };
      contentDetails: { duration: string };
      statistics: { viewCount?: string };
    }) => ({
      youtubeId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl:
        item.snippet.thumbnails.maxres?.url ??
        item.snippet.thumbnails.high?.url ??
        item.snippet.thumbnails.medium?.url ?? "",
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      viewCount: Number(item.statistics.viewCount ?? 0),
      channelTitle: item.snippet.channelTitle,
    }));
}

export async function getYoutubeVideos(
  page = 1,
  limit = 20,
  pageToken?: string
): Promise<YtListResult> {
  const cacheKey = `yt:list:${page}:${limit}:${pageToken ?? "start"}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as YtListResult;

  const { ids, nextPageToken, totalResults } = await fetchPlaylistItems(pageToken, limit);
  const videos = await fetchVideoDetails(ids);

  const result: YtListResult = { videos, nextPageToken, totalResults };
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
  return result;
}

export async function getYoutubeVideo(youtubeId: string): Promise<YtVideo | null> {
  const cacheKey = `yt:video:${youtubeId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as YtVideo;

  const videos = await fetchVideoDetails([youtubeId]);
  if (videos.length === 0) return null;

  await redis.set(cacheKey, JSON.stringify(videos[0]), "EX", CACHE_TTL);
  return videos[0];
}

// ── Show name extraction ──────────────────────────────

export function extractShowName(title: string): string {
  // 1. "ShowName" гэж quoted байвал тэр нь show нэр
  const quoted = title.match(/^["«]([^"»]+)["»]/);
  if (quoted) return quoted[1].trim();

  // 2. /YYYY.MM.DD/ огноог хасаад үлдсэн хэсгийг авна
  let name = title
    .replace(/\/\d{4}\.\d{2}\.\d{2}\//g, "")
    .replace(/#\w+/g, "")                           // hashtag
    .replace(/\|\s*MNB.*$/i, "")                   // | MNB suffix
    .replace(/\s{2,}/g, " ")
    .trim();

  // 3. Дескриптор хасна
  name = name
    .replace(/\s*мэдээллийн\s*хөтөлбөр\s*$/i, "")
    .replace(/\s*нэвтрүүлэг\s*$/i, "")
    .replace(/\s*хөтөлбөр\s*$/i, "")
    .replace(/\s*-\s*.+$/, "")                     // " - дэд гарчиг" хасна
    .trim();

  return name || title;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9Ѐ-ӿ-]/g, "")
    .slice(0, 60);
}

// Олон хуудасны видеог нэгтгэж show-уудыг буцаана (cache 1 цаг)
export async function getYoutubeShows(fetchPages = 5): Promise<YtShow[]> {
  const cacheKey = "yt:shows:v4";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as YtShow[];

  // 5 хуудас × 50 видео = 250 видео татна
  const allVideos: YtVideo[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < fetchPages; i++) {
    const { ids, nextPageToken } = await fetchPlaylistItems(pageToken, 50);
    const videos = await fetchVideoDetails(ids);
    allVideos.push(...videos);
    if (!nextPageToken) break;
    pageToken = nextPageToken;
  }

  // Show-уудаар бүлэглэнэ
  const showMap = new Map<string, YtVideo[]>();
  for (const v of allVideos) {
    const show = extractShowName(v.title);
    if (!showMap.has(show)) showMap.set(show, []);
    showMap.get(show)!.push(v);
  }

  // Duplicate slug шийдэх — хэрэв давхцвал -2, -3 нэмнэ
  const slugCount = new Map<string, number>();

  const shows: YtShow[] = Array.from(showMap.entries())
    .map(([name, videos]) => {
      const sorted = [...videos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const baseSlug = slugify(name);
      const count = (slugCount.get(baseSlug) ?? 0) + 1;
      slugCount.set(baseSlug, count);
      const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;

      return {
        slug,
        name,
        thumbnailUrl: sorted[0].thumbnailUrl,
        episodeCount: videos.length,
        latestDate: sorted[0].publishedAt,
        latestId: sorted[0].youtubeId,
        genre: detectGenre(name, sorted[0].title),
      };
    })
    .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

  await redis.set(cacheKey, JSON.stringify(shows), "EX", 60 * 60); // 1 цаг
  return shows;
}

export async function getYoutubeShowVideos(slug: string, fetchPages = 5): Promise<YtVideo[]> {
  const shows = await getYoutubeShows(fetchPages);
  const show = shows.find((s) => s.slug === slug);
  if (!show) return [];

  // Бүх видеог дахин татаж, энэ show-ын видеог шүүнэ
  const allVideos: YtVideo[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < fetchPages; i++) {
    const { ids, nextPageToken } = await fetchPlaylistItems(pageToken, 50);
    const videos = await fetchVideoDetails(ids);
    allVideos.push(...videos);
    if (!nextPageToken) break;
    pageToken = nextPageToken;
  }

  return allVideos
    .filter((v) => slugify(extractShowName(v.title)) === slug)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function searchYoutubeVideos(query: string, maxResults = 10): Promise<YtVideo[]> {
  const cacheKey = `yt:search:${query}:${maxResults}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as YtVideo[];

  // search.list = 100 unit → зөвхөн хайлтад ашиглана
  const { data } = await axios.get(`${YT}/search`, {
    params: {
      part: "snippet",
      channelId: process.env.MNB_YOUTUBE_CHANNEL_ID,
      q: query,
      type: "video",
      maxResults,
      order: "relevance",
      key: KEY,
    },
  });

  const ids: string[] = data.items.map(
    (i: { id: { videoId: string } }) => i.id.videoId
  );
  const videos = await fetchVideoDetails(ids);

  await redis.set(cacheKey, JSON.stringify(videos), "EX", CACHE_TTL);
  return videos;
}
