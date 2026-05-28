"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/store/settingsStore";

/* Next.js 14 App Router: app/not-found.tsx нь route-аас гадуурх URL руу
   орох үед root layout-тойгоо хамт автоматаар render хийгдэнэ.
   МНБ brand-тай зохистой, useful navigation санал болгосон. */
export default function NotFound() {
  const router = useRouter();
  const t = useT();

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pt-[var(--header-h)] pb-20 relative overflow-hidden">
      {/* Background — товчоо brand цэнхэр radial glow */}
      <div className="absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          background: "radial-gradient(60% 50% at 50% 35%, var(--accent) 0%, transparent 100%)",
        }} />

      <div className="text-center max-w-lg space-y-7">

        {/* TV static box — "сигнал алга" мэдрэмж */}
        <div className="relative w-28 h-28 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-card border border-app overflow-hidden">
            {/* Static noise pattern */}
            <div className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
              }} />
            {/* TV "no signal" SVG */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" className="text-muted">
                <rect x="2" y="6" width="20" height="13" rx="2" />
                <polyline points="17 2 12 7 7 2" />
                <line x1="6" y1="22" x2="18" y2="22" />
                <line x1="2" y1="6" x2="22" y2="19" className="text-[var(--danger)]/70" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 404 цифр — МНБ brand 3-өнгөнд */}
        <div className="text-[88px] sm:text-[120px] font-black leading-none tracking-tighter select-none">
          <span className="text-[var(--danger)]">4</span>
          <span className="text-accent">0</span>
          <span className="text-[var(--danger)]">4</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-app">
            {t("not_found_title")}
          </h1>
        </div>

        {/* Үндсэн action — нүүр + буцах */}
        <div className="flex items-center gap-2.5 justify-center flex-wrap">
          <Link href="/"
            className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
            {t("go_home")}
          </Link>
          <button onClick={() => router.back()}
            className="px-6 py-2.5 rounded-full bg-card hover:bg-card-hover border border-app text-app text-sm font-semibold transition-colors">
            {t("go_back")}
          </button>
        </div>

      </div>
    </main>
  );
}
