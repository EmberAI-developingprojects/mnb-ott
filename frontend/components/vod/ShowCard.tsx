import Link from "next/link";

interface ShowCardProps {
  slug: string;
  name: string;
  thumbnailUrl: string;
  episodeCount: number;
  latestDate: string;
}

export function ShowCard({ slug, name, thumbnailUrl, episodeCount, latestDate }: ShowCardProps) {
  const date = new Date(latestDate).toLocaleDateString("mn-MN", { month: "short", day: "numeric" });

  return (
    <Link href={`/vod/shows/${slug}`} className="group block space-y-2">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-surface">
        <img
          src={thumbnailUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white font-semibold text-sm line-clamp-2 leading-snug">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-primary/80 text-white px-1.5 py-0.5 rounded font-medium">
              {episodeCount} анги
            </span>
            <span className="text-xs text-white/60">{date}</span>
          </div>
        </div>

        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
      </div>
    </Link>
  );
}
