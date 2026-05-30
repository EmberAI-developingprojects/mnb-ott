"use client";

import { useEffect, useState } from "react";
import { useT } from "@/store/settingsStore";
import api, { cachedGet } from "@/lib/api";
import { HeroCarousel } from "./_home/HeroCarousel";
import { ChannelStrip } from "./_home/ChannelStrip";
import { LiveEventBanner } from "./_home/LiveEventBanner";
import { Section } from "./_home/Section";
import { VideoCard } from "./_home/VideoCard";
import { PosterCard } from "./_home/PosterCard";
import { BundleCard } from "./_home/BundleCard";
import type { ApiChannel, Video, Bundle } from "./_home/types";

interface LiveEvent extends ApiChannel { endsAt?: string | null; price?: number | null }

interface ChannelsResponse {
  tv:    ApiChannel[];
  radio: ApiChannel[];
  live:  LiveEvent[];
}

/* HOME — Wavve-inspired layout
   1. SOLID HEADER (separate layout)
   2. HERO CARD — rounded, max-width, wrap-around carousel
   3. CHANNEL STRIP — pill shapes
   4. CONTENT ROWS — bundles, library (poster), archive (landscape) */
export default function HomePage() {
  const t = useT();

  const [archive,  setArchive] = useState<Video[]>([]);
  const [library,  setLibrary] = useState<Video[]>([]);
  const [bundles,  setBundles] = useState<Bundle[]>([]);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [hero,     setHero]    = useState<Video[]>([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/archive", { params: { limit: 8 } }),
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/library", { params: { limit: 8 } }),
      api.get<{ success: true; data: { bundles: Bundle[] } }>("/api/vod/bundles"),
      cachedGet<{ success: true; data: ChannelsResponse }>("/api/channels"),
    ]).then(([a, l, b, c]) => {
      const ch = c.data.data;
      /* Backend нь tv/radio/live групп болгож буцаадаг — frontend filter хэрэггүй. */
      setLiveEvents(ch.live ?? []);
      setChannels([...(ch.tv ?? []), ...(ch.radio ?? [])]);
      setArchive(a.data.data.videos);
      setLibrary(l.data.data.videos);
      setBundles(b.data.data.bundles);
      /* Hero — Library-аас 3, Archive-аас 2 видео авч 5 slide үүсгэнэ. */
      setHero([...l.data.data.videos.slice(0, 3), ...a.data.data.videos.slice(0, 2)]);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-[var(--header-h)]">
      <HeroCarousel hero={hero} loading={loading} />

      <LiveEventBanner events={liveEvents} />

      <ChannelStrip channels={channels} />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 py-10 space-y-12">
        {/* Эхний эгнээний эхний карт — LCP candidate байж болзошгүй учир priority */}
        <Section title={t("bundles")} href="/bundles" t={t}
          loading={loading} skeleton="wide">
          {bundles.map((b, i) => <BundleCard key={b.id} bundle={b} priority={i === 0} />)}
        </Section>

        <Section title={t("library")} href="/library" t={t}
          loading={loading} skeleton="poster">
          {library.map((v, i) => <PosterCard key={v.youtubeId} v={v} priority={i === 0} />)}
        </Section>

        <Section title={t("archive")} href="/archive" t={t}
          loading={loading} skeleton="landscape">
          {archive.map((v, i) => <VideoCard key={v.youtubeId} v={v} priority={i === 0} />)}
        </Section>
      </div>
    </div>
  );
}
