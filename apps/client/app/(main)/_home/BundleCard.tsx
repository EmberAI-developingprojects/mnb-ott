"use client";

import Link from "next/link";
import Image from "next/image";
import type { Bundle } from "./types";

/* Wide (16:10) bundle card — Багц row-д ашиглагдана.
   Category badge top-left, hover үед image зураг бага зэрэг zoom хийгдэнэ. */
export function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <Link href={`/bundles/${bundle.id}`}
      className="group shrink-0 w-[320px] sm:w-[360px] block">
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-card ring-1 ring-transparent group-hover:ring-2 group-hover:ring-accent ring-inset transition-all duration-200">
        <Image src={bundle.thumbnailUrl} alt={bundle.title} fill
          sizes="(max-width: 640px) 90vw, 360px"
          className="object-cover transition-transform duration-[700ms] group-hover:scale-[1.04]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        {bundle.category && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wider">
            {bundle.category.label}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">
            {bundle.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
