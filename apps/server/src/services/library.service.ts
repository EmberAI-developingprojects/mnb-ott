import * as yt from "./youtube.service";
import type { YtVideo, Genre } from "./youtube.service";

/* ─────────────────────────────────────────────────────
   ТУРШИЛТЫН ӨГӨГДӨЛ — YouTube API-ээс ирсэн видеог
   3 хэсэгт хуваарилна:

     ▸ archive : YouTube архив (BASIC plan, нэвтэрсэн бол үнэгүй)
                 Genre-ээр ангилагдана.

     ▸ library : Премиум VOD сан (VOD/COMBO plan-аар сараар)
                 Тус бүр видеог худалдаж АВАХГҮЙ — нийт санг
                 сарын захиалгаар үзнэ.
                 Genre-ээр ангилагдана.

     ▸ bundles : Бүлэглэсэн багц. Багц дотроос видео тус бүрийг
                 өөрийн үнээр 72 цагаар түрээслэнэ.

   Production-д библиотек, багцыг Admin UI-аас VodContent,
   VodBundle хүснэгтэд бичнэ.
───────────────────────────────────────────────────── */

export interface VideoWithGenre extends YtVideo { genre: Genre; }
export interface BundleItem extends YtVideo  { price: number; }

export interface BundleCategory { id: string; label: string; }
export interface Bundle {
  id:           string;
  title:        string;
  description:  string;
  thumbnailUrl: string;
  category:     BundleCategory;
  items:        BundleItem[];
}

/** YouTube видеог 3 хэсэгт хуваарилна (latest 30-аас). */
async function getPool(): Promise<YtVideo[]> {
  const res = await yt.getYoutubeVideos(1, 30);
  return res.videos;
}

function withGenre(v: YtVideo): VideoWithGenre {
  return { ...v, genre: yt.detectGenre("", v.title) };
}

/* ─── Архив ───────────────────────────────────────── */
export async function getArchiveLatest(limit = 5): Promise<VideoWithGenre[]> {
  const pool = await getPool();
  return pool.slice(0, limit).map(withGenre);
}

export async function getArchiveAll(): Promise<VideoWithGenre[]> {
  const pool = await getPool();
  return pool.slice(0, 10).map(withGenre);
}

/* ─── Видео сан (премиум) ─────────────────────────── */
export async function getLibraryLatest(limit = 5): Promise<VideoWithGenre[]> {
  const pool = await getPool();
  return pool.slice(5, 5 + limit).map(withGenre);
}

export async function getLibraryAll(): Promise<VideoWithGenre[]> {
  const pool = await getPool();
  return pool.slice(5, 20).map(withGenre);
}

/* ─── Багц ────────────────────────────────────────── */
const BUNDLES_META: { id: string; title: string; description: string; category: BundleCategory }[] = [
  {
    id: "documentary",
    title: "Баримтат цуглуулга",
    description: "Монголын соёл, түүх, байгалын тухай баримтат бүтээлүүд",
    category: { id: "documentary", label: "Баримтат" },
  },
  {
    id: "shows",
    title: "Шилдэг шоунууд",
    description: "Сонирхолтой нэвтрүүлэг, шоу, ярилцлагын цуглуулга",
    category: { id: "shows", label: "Шоу" },
  },
  {
    id: "kids",
    title: "Хүүхдийн анги",
    description: "Хүүхдэд зориулсан боловсролын болон зугаацуулах багц",
    category: { id: "kids", label: "Хүүхэд" },
  },
];

export async function getBundles(itemsPerBundle = 5): Promise<Bundle[]> {
  const pool = await getPool();
  const fromOffset = 10;
  return BUNDLES_META.map((b, bIdx) => {
    const slice = pool.slice(
      fromOffset + bIdx * itemsPerBundle,
      fromOffset + (bIdx + 1) * itemsPerBundle,
    );
    return {
      ...b,
      thumbnailUrl: slice[0]?.thumbnailUrl ?? "",
      items: slice.map((v, i) => ({ ...v, price: 1900 + i * 300 })),
    };
  }).filter((b) => b.items.length > 0);
}

export async function getBundleById(id: string): Promise<Bundle | null> {
  const all = await getBundles();
  return all.find((b) => b.id === id) ?? null;
}

/** YouTube ID контентын төрлийг тогтоох (access check-д ашиглана) */
export type ContentKind = "archive" | "library" | "bundle";

export async function classifyContent(youtubeId: string): Promise<{
  kind: ContentKind;
  price?: number;
  bundleId?: string;
}> {
  const pool = await getPool();
  const idx = pool.findIndex((v) => v.youtubeId === youtubeId);
  if (idx < 0)         return { kind: "archive" };
  if (idx < 5)         return { kind: "archive" };
  if (idx < 10)        return { kind: "library" };

  // Багц — 3 багц × 5 видео
  const bundleIdx = Math.floor((idx - 10) / 5);
  const inIdx     = (idx - 10) % 5;
  const meta      = BUNDLES_META[bundleIdx];
  if (!meta) return { kind: "archive" };
  return { kind: "bundle", bundleId: meta.id, price: 1900 + inIdx * 300 };
}
