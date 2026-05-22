"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "@/components/layout/MediaCard";
import api from "@/lib/api";

interface Video {
  youtubeId: string; title: string; thumbnailUrl: string;
  duration: number; publishedAt: string; price: number;
}
interface BundleCategory { id: string; label: string; }
interface Bundle {
  id: string; title: string; description?: string;
  thumbnailUrl: string; category?: BundleCategory; items: Video[];
}

export default function BundleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: true; data: Bundle }>(`/api/vod/bundles/${id}`)
      .then((r) => setBundle(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-16">
      <Skeleton className="h-8 w-72 mb-6" />
      <Grid>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
      </Grid>
    </div>
  );
  if (!bundle) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-[calc(var(--header-h)+24px)] pb-16">
      <h1 className="text-2xl md:text-3xl font-bold text-app mb-6">{bundle.title}</h1>

      <Grid>
        {bundle.items.map((v) => (
          <MediaCard key={v.youtubeId}
            href={`/vod/${v.youtubeId}`}
            title={v.title}
            thumbnailUrl={v.thumbnailUrl}
            duration={v.duration} />
        ))}
      </Grid>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
      {children}
    </div>
  );
}
