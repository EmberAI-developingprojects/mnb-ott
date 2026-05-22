"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDuration } from "@/lib/utils";

interface Props {
  href:        string;
  title:       string;
  thumbnailUrl:string;
  duration?:   number;
}

/* Media card — нэгдсэн стайл
   ─────────────────────────────────────────────
   • Hover: цэнхэр ring (томрох/хөвөх биш)
   • Badge байхгүй
   • Үнэ нь зөвхөн дэлгэрэнгүй хуудаст л харагдана
*/
export function MediaCard({ href, title, thumbnailUrl, duration }: Props) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-card
        ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <Image src={thumbnailUrl} alt={title} fill
          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 35vw, 280px"
          className="object-cover" loading="lazy" />

        {duration && duration > 0 ? (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-white text-[10px] font-mono tabular-nums">
            {formatDuration(duration)}
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 text-[13.5px] text-app line-clamp-2 leading-snug group-hover:text-accent transition-colors px-0.5">
        {title}
      </p>
    </Link>
  );
}
