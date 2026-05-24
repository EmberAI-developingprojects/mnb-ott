"use client";

import { useMemo } from "react";

/* SVG-аар inline sparkline chart — chart library суулгах хэрэггүй.
   Дата нэг л өсөн буурахыг харуулна. Tooltip байхгүй, зөвхөн tab тус бүрт ерөнхий
   динамик зурдаг (Stripe dashboard маяг). */

interface Props {
  data:    { date: string; amount: number }[];
  height?: number;
  formatY?: (v: number) => string;
}

export function SparkChart({ data, height = 64, formatY }: Props) {
  const { points, max, min } = useMemo(() => {
    const values = data.map((d) => d.amount);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    return { max, min, points: values };
  }, [data]);

  if (data.length === 0) return null;

  const W = 100; /* viewBox-ийн өргөн (responsive) */
  const H = 100;
  const step = W / Math.max(1, data.length - 1);

  /* Y-ийг доош нь reverse — SVG-д top-left 0,0 */
  const toY = (v: number) => H - ((v - min) / (max - min || 1)) * H;

  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(v)}`)
    .join(" ");

  /* Доороо градиент fill — visual depth */
  const areaPath = `${path} L ${(points.length - 1) * step} ${H} L 0 ${H} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgb(var(--primary-rgb,0 70 165))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(var(--primary-rgb,0 70 165))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#spark-gradient)" />
        <path d={path}     fill="none" stroke="#0046A5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Min/max label corner-уудад */}
      {formatY && (
        <>
          <span className="absolute top-0 left-0 text-[10px] text-muted">{formatY(max)}</span>
          <span className="absolute bottom-0 left-0 text-[10px] text-muted">{formatY(min)}</span>
        </>
      )}
    </div>
  );
}
