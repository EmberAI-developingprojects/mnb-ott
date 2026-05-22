"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/store/settingsStore";

/* Next.js 14 App Router: app/not-found.tsx нь route-аас гадуурх URL руу
   орох үед root layout-тойгоо хамт автоматаар render хийгдэнэ.
   Header/Footer-ийг хадгалахын тулд min-h дотроос goрчоосон ... */
export default function NotFound() {
  const router = useRouter();
  const { lang } = useSettingsStore();

  const mn = lang === "mn";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pt-[var(--header-h)] pb-20 relative overflow-hidden">
      {/* Background decorative gradient */}
      <div className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          background: "radial-gradient(60% 50% at 50% 35%, var(--accent) 0%, transparent 100%)",
        }} />

      <div className="text-center max-w-md space-y-6">
        {/* 404 — Brand colored MNB logo style */}
        <div className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter select-none">
          <span className="text-[var(--danger)]">4</span>
          <span className="text-accent">0</span>
          <span className="text-[var(--danger)]">4</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-app">
            {mn ? "Хуудас олдсонгүй" : "Page not found"}
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            {mn
              ? "Таны хайсан хуудас зөөгдсөн эсвэл устсан байж магадгүй."
              : "The page you’re looking for has moved or no longer exists."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 justify-center flex-wrap pt-2">
          <Link href="/"
            className="px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors">
            {mn ? "Нүүр хуудас" : "Go home"}
          </Link>
          <button onClick={() => router.back()}
            className="px-5 py-2.5 rounded-full bg-card hover:bg-card-hover border border-app text-app text-sm font-semibold transition-colors">
            {mn ? "Буцах" : "Go back"}
          </button>
        </div>

      </div>
    </main>
  );
}
