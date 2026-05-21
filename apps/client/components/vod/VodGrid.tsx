import { VodCard } from "./VodCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface Video {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
}

interface VodGridProps {
  videos: Video[];
  loading?: boolean;
}

export function VodGrid({ videos, loading }: VodGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {videos.map((v) => (
        <VodCard
          key={v.youtubeId}
          id={v.youtubeId}
          title={v.title}
          thumbnailUrl={v.thumbnailUrl}
          duration={v.duration}
          viewCount={v.viewCount}
          publishedAt={v.publishedAt}
          type="youtube"
        />
      ))}
    </div>
  );
}
