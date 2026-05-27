"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { VodPlayer } from "@/components/player/VodPlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/layout/UpgradePrompt";
import { LoginPrompt } from "@/components/layout/LoginPrompt";
import { ScrollRow } from "@/components/layout/ScrollRow";
import { useAuthStore } from "@/store/authStore";
import { useT, useSettingsStore } from "@/store/settingsStore";
import { useWatchlistStore } from "@/store/watchlistStore";
import { formatDuration, formatViews, cn } from "@/lib/utils";
import api from "@/lib/api";

interface VideoDetail {
  youtubeId:    string;
  title:        string;
  description:  string;
  thumbnailUrl: string;
  duration:     number;
  viewCount:    number;
  publishedAt:  string;
  channelTitle: string;
  accessKind?:  "archive" | "library" | "bundle";
  price?:       number;
  bundleId?:    string;
}

interface AccessDecision {
  allowed:        boolean;
  reason?:        "PLAN_REQUIRED" | "PURCHASE_REQUIRED" | "EXPIRED";
  requiredPlans?: string[];
}

interface RelatedVideo {
  youtubeId:    string;
  title:        string;
  thumbnailUrl: string;
  duration:     number;
  publishedAt:  string;
}

export default function VodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { lang } = useSettingsStore();
  const { user } = useAuthStore();
  const { add, remove, has } = useWatchlistStore();
  const saved = has(id);

  const [video, setVideo]     = useState<VideoDetail | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess]   = useState<AccessDecision | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [vRes, rRes] = await Promise.all([
          api.get<{ success: true; data: VideoDetail }>(`/api/vod/${id}`),
          api.get<{ success: true; data: { videos: RelatedVideo[] } }>("/api/vod/youtube", { params: { limit: 12 } }),
        ]);
        setVideo(vRes.data.data);
        setRelated(rRes.data.data.videos.filter((v) => v.youtubeId !== id));

        if (user && vRes.data.data.accessKind) {
          try {
            const a = await api.post<{ success: true; data: AccessDecision }>(
              "/api/subscription/access",
              { kind: vRes.data.data.accessKind, vodId: id },
            );
            setAccess(a.data.data);
          } catch {
            setAccess({ allowed: false, reason: "PLAN_REQUIRED" });
          }
        } else {
          setAccess({ allowed: !!user });
        }
      } catch {
        router.push("/archive");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router, user]);

  function toggleWatchlist() {
    if (!video) return;
    if (saved) remove(id);
    else add({ id, title: video.title, thumbnailUrl: video.thumbnailUrl, duration: video.duration });
  }

  async function share() {
    if (!video) return;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, url: window.location.href }); }
      catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        /* toast байгаагүй учир brief visual feedback хийхгүй — clipboard амжилттай copied */
      } catch { /* silent */ }
    }
  }

  if (loading) return <LoadingState />;
  if (!video)  return null;

  const date = new Date(video.publishedAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  /* Description-аас URL шугам цэвэрлэнэ (YouTube description ихэвчлэн зөвхөн линк) */
  const descClean = (video.description ?? "")
    .split("\n")
    .filter((l) => !l.match(/^\s*https?:\/\//))
    .join("\n")
    .trim();
  const showToggle = descClean.length > 240;

  return (
    <div className="pt-[var(--header-h)]">
      {/* ── 1. PLAYER — full width, cinematic.
              Player-ийн зүүн дээр буланд floating "< back" товч overlay. */}
      <section className="max-w-[1240px] mx-auto px-3 md:px-6 pt-4 md:pt-6">
        <div className="relative">
          {access?.allowed ? (
            <VodPlayer
              youtubeId={video.youtubeId}
              vodId={id}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              duration={video.duration}
            />
          ) : !user ? (
            <LoginPrompt backdrop={video.thumbnailUrl} title={video.title} />
          ) : (
            <UpgradePrompt
              kind={video.accessKind === "bundle" ? "bundle" : "library"}
              vodId={id}
              price={video.price}
              title={video.title}
              backdrop={video.thumbnailUrl}
            />
          )}

          {/* Back товч — player-ийн зүүн дээр overlay. z-[30] нь VodPlayer-ийн
              click overlay z-[22]-аас дээр, тиймээс тапаас алдагдахгүй. */}
          <button onClick={() => router.back()} aria-label={t("back")}
            className="absolute top-3 left-3 z-[30] w-9 h-9 rounded-full bg-black/55 hover:bg-black/75
              backdrop-blur flex items-center justify-center text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>
      </section>

      {/* ── 2. INFO BLOCK ── */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 mt-6 md:mt-8 space-y-5">
        {/* Title + meta */}
        <div className="space-y-3">
          <h1 className="text-xl md:text-3xl font-bold text-app leading-tight">
            {video.title}
          </h1>

          <div className="flex items-center gap-2 text-[13px] text-sub flex-wrap">
            <span className="font-medium text-app">{video.channelTitle}</span>
            {video.viewCount > 0 && (
              <><span className="text-muted">·</span>
              <span>{formatViews(video.viewCount)} {lang === "mn" ? "үзэлт" : "views"}</span></>
            )}
            <span className="text-muted">·</span>
            <span>{date}</span>
            {video.duration > 0 && (
              <><span className="text-muted">·</span>
              <span className="font-mono tabular-nums">{formatDuration(video.duration)}</span></>
            )}
          </div>
        </div>

        {/* Action pills — Save / Share / Back */}
        <div className="flex items-center gap-2 flex-wrap">
          <ActionPill
            active={saved}
            onClick={toggleWatchlist}
            label={saved
              ? (lang === "mn" ? "Хадгалсан" : "Saved")
              : (lang === "mn" ? "Хадгалах" : "Save")}
            icon={saved ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )} />

          <ActionPill
            onClick={share}
            label={lang === "mn" ? "Хуваалцах" : "Share"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            } />
        </div>

        {/* Description */}
        {descClean && (
          <div className="bg-card border border-app rounded-2xl p-4 md:p-5">
            <p className={cn(
              "text-[13.5px] text-sub leading-relaxed whitespace-pre-line",
              !descExpanded && "line-clamp-3",
            )}>
              {descClean}
            </p>
            {showToggle && (
              <button onClick={() => setDescExpanded(!descExpanded)}
                className="mt-2 text-[12px] font-semibold text-sub hover:text-app transition-colors">
                {descExpanded
                  ? (lang === "mn" ? "Хураах" : "Show less")
                  : (lang === "mn" ? "Дэлгэрэнгүй харах" : "Show more")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── 3. RELATED — horizontal scroll row (cinematic) ── */}
      {related.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 mt-10 md:mt-14 pb-16">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-app">
              {lang === "mn" ? "Холбоотой нэвтрүүлэг" : "Related videos"}
            </h2>
            <Link href="/archive"
              className="text-[13px] font-semibold text-sub hover:text-app transition-colors">
              {t("see_more")}
            </Link>
          </div>

          <ScrollRow>
            {related.slice(0, 12).map((v) => <RelatedCard key={v.youtubeId} v={v} lang={lang} />)}
          </ScrollRow>
        </section>
      )}
    </div>
  );
}

/* ─── Action pill — Save / Share — нэг загвар ──────────────── */
function ActionPill({ icon, label, active, onClick }: {
  icon:    React.ReactNode;
  label:   string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors",
        /* Active: brand цэнхэр highlight (өмнө `bg-app text-bg` нь хоёулаа var(--bg) болж текст харагдахгүй байсан). */
        active
          ? "bg-brand text-white border-brand hover:bg-brand-hover"
          : "bg-card border-app text-app hover:bg-card-hover",
      )}>
      {icon}
      {label}
    </button>
  );
}

/* ─── Related card — горизонталь scroll-д ──────────────────── */
function RelatedCard({ v, lang }: { v: RelatedVideo; lang: "mn" | "en" }) {
  const date = new Date(v.publishedAt).toLocaleDateString(lang === "mn" ? "mn-MN" : "en-US",
    { month: "short", day: "numeric" });

  return (
    <Link href={`/vod/${v.youtubeId}`}
      className="group shrink-0 w-[220px] sm:w-[250px] md:w-[280px] block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <Image src={v.thumbnailUrl} alt={v.title} fill
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 35vw, 280px"
          className="object-cover" loading="lazy" />
        {v.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums">
            {formatDuration(v.duration)}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[13.5px] text-app line-clamp-2 leading-snug group-hover:text-accent transition-colors px-0.5">
        {v.title}
      </p>
      <p className="mt-1 text-[11.5px] text-muted px-0.5">{date}</p>
    </Link>
  );
}

/* ─── Loading skeleton ──────────────────────────────────── */
function LoadingState() {
  return (
    <div className="pt-[var(--header-h)]">
      <section className="max-w-[1240px] mx-auto px-3 md:px-6 pt-4 md:pt-6">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </section>
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 mt-6 space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </section>
      <section className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 mt-12">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-[260px] aspect-video rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
