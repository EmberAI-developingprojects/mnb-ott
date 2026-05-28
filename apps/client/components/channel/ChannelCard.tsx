"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

interface ChannelCardProps {
  channel: Channel & { isRadio?: boolean };
  active?: boolean;
  onClick?: () => void;
}

export function ChannelCard({ channel, active, onClick }: ChannelCardProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
        active
          ? "border-accent/60 bg-accent/10"
          : "border-app bg-surface hover:border-strong hover:bg-card"
      )}
      onClick={onClick}
    >
      {/* Thumbnail / logo */}
      <div className="relative h-9 aspect-[2/1] rounded-md bg-black shrink-0 overflow-hidden ring-1 ring-[var(--border-strong)]">
        {channel.thumbnailUrl ? (
          <Image src={channel.thumbnailUrl} alt={channel.name} fill sizes="72px" className="object-contain" />
        ) : (
          <span className="text-base font-bold text-accent flex items-center justify-center w-full h-full">
            {channel.orderIndex}
          </span>
        )}
        {channel.isRadio && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-app truncate">{channel.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DA2031] animate-pulse shrink-0" />
          <span className="text-[10px] text-[#DA2031]/70 font-semibold tracking-wider">
            {channel.isRadio ? "RADIO" : "LIVE"}
          </span>
        </div>
      </div>

      {active && (
        <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
      )}
    </div>
  );

  if (onClick) return content;
  return <Link href={`/live?ch=${channel.slug}`}>{content}</Link>;
}
