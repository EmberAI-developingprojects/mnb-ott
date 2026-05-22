"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** Cards-ийг центрт байрлуулах эсэх (overflow байхгүй үед) */
  center?:  boolean;
  /** Scroll товчны нэг даралтын урт (px). Default 380 */
  step?:    number;
  className?: string;
}

/**
 * Horizontal scroll row + scroll position-аар nav arrows-г харуулна:
 * - Зүүн талд тулсан үед prev arrow нуугдана
 * - Баруун талд тулсан үед next arrow нуугдана
 * - Overflow байхгүй бол хоёр arrow нуугдана
 * - `center` тогтоосон үед items центрлэгдэнэ (тулахгүй бол)
 */
export function ScrollRow({ children, center, step = 380, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 4;
    setCanPrev(overflow && el.scrollLeft > 4);
    setCanNext(overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  /* Children солигдоход дахин шалгах */
  useEffect(() => { update(); }, [children, update]);

  const scroll = (d: "l" | "r") =>
    ref.current?.scrollBy({ left: d === "r" ? step : -step, behavior: "smooth" });

  return (
    <div className={cn("relative group/row", className)}>
      {canPrev && (
        <button onClick={() => scroll("l")} aria-label="prev"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-10 h-10 rounded-full
            bg-elevated border border-app shadow-card flex items-center justify-center hover:bg-card-hover transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      )}
      {canNext && (
        <button onClick={() => scroll("r")} aria-label="next"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-10 h-10 rounded-full
            bg-elevated border border-app shadow-card flex items-center justify-center hover:bg-card-hover transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-app">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}
      <div ref={ref}
        className={cn(
          "flex gap-3 overflow-x-auto py-2",
          center && "justify-center",
        )}>
        {children}
      </div>
    </div>
  );
}
