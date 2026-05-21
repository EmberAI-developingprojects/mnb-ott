import Link from "next/link";
import { formatDuration, formatViews } from "@/lib/utils";

interface VodCardProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration?: number;
  viewCount?: number;
  publishedAt?: string;
  type?: "youtube" | "premium";
}

export function VodCard({
  id, title, thumbnailUrl, duration, viewCount, publishedAt, type = "youtube",
}: VodCardProps) {
  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString("mn-MN", { month: "short", day: "numeric" })
    : "";

  return (
    <Link href={`/vod/${id}`} className="group block space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-surface">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {duration != null && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(duration)}
          </span>
        )}

        {type === "premium" && (
          <span className="absolute top-1.5 left-1.5 bg-primary text-white text-xs px-1.5 py-0.5 rounded font-bold">
            PREMIUM
          </span>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/0 group-hover:bg-white/20 transition-all flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"
              className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-app line-clamp-2 leading-snug font-medium">
          {title}
        </p>
        <p className="text-xs text-muted">
          {viewCount != null && `${formatViews(viewCount)} үзэлт`}
          {viewCount != null && date && " · "}
          {date}
        </p>
      </div>
    </Link>
  );
}
