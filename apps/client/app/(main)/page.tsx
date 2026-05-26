"use client";

import { useEffect, useState } from "react";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api from "@/lib/api";
import { HeroCarousel } from "./_home/HeroCarousel";
import { ChannelStrip } from "./_home/ChannelStrip";
import { Section } from "./_home/Section";
import { VideoCard } from "./_home/VideoCard";
import { PosterCard } from "./_home/PosterCard";
import { BundleCard } from "./_home/BundleCard";
import type { ApiChannel, Video, Bundle } from "./_home/types";

/* HOME — Wavve-inspired layout
   1. SOLID HEADER (separate layout)
   2. HERO CARD — rounded, max-width, wrap-around carousel
   3. CHANNEL STRIP — pill shapes
   4. CONTENT ROWS — bundles, library (poster), archive (landscape) */
export default function HomePage() {
  const t = useT();
  const { lang } = useSettingsStore();

  const [archive,  setArchive] = useState<Video[]>([]);
  const [library,  setLibrary] = useState<Video[]>([]);
  const [bundles,  setBundles] = useState<Bundle[]>([]);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [hero,     setHero]    = useState<Video[]>([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/archive", { params: { limit: 8 } }),
      api.get<{ success: true; data: { videos: Video[] } }>("/api/vod/library", { params: { limit: 8 } }),
      api.get<{ success: true; data: { bundles: Bundle[] } }>("/api/vod/bundles"),
      api.get<{ success: true; data: { channels: ApiChannel[] } }>("/api/channels"),
    ]).then(([a, l, b, c]) => {
      /* LIVE төрлийг хасна — /live тусдаа хуудастай, ChannelStrip-д TV/RADIO л үлдэнэ. */
      setChannels(c.data.data.channels.filter((ch) => ch.kind !== "LIVE"));
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

      <ChannelStrip channels={channels} />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10 xl:px-16 py-10 space-y-12">
        <Section title={lang === "mn" ? "Видео багц" : "Bundles"} href="/bundles" t={t}
          loading={loading} skeleton="wide">
          {bundles.map((b) => <BundleCard key={b.id} bundle={b} />)}
        </Section>

        <Section title={lang === "mn" ? "Видео сан" : "Library"} href="/library" t={t}
          loading={loading} skeleton="poster">
          {library.map((v) => <PosterCard key={v.youtubeId} v={v} />)}
        </Section>

        <Section title={lang === "mn" ? "Архив" : "Archive"} href="/archive" t={t}
          loading={loading} skeleton="landscape">
          {archive.map((v) => <VideoCard key={v.youtubeId} v={v} />)}
        </Section>
      </div>
    </div>
  );
}
