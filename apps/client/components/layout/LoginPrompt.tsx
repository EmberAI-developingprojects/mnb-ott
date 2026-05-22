"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useSettingsStore } from "@/store/settingsStore";

interface Props {
  /** Backdrop болон гарчиг — VOD/Live дэлгэцтэй уялдсан байх */
  backdrop?: string;
  title?: string;
}

/* Нэвтрээгүй хэрэглэгчид VodPlayer-ын оронд тогтсон player frame дотор
   "Нэвтэрнэ үү" CTA-г харуулна. Одоогийн pathname-ийг callbackUrl болгож
   /login руу дамжуулна — login дараа буцаж тухайн видеогоо үзнэ. */
export function LoginPrompt({ backdrop, title }: Props) {
  const { lang } = useSettingsStore();
  const pathname = usePathname();
  const params = useSearchParams();

  /* Pathname + хайлтын string-ийг хослуулж бүтэн URL-аар буцах */
  const query = params.toString();
  const fullPath = query ? `${pathname}?${query}` : pathname;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(fullPath)}`;
  const registerHref = `/register?callbackUrl=${encodeURIComponent(fullPath)}`;

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-card">
      {backdrop && (
        <Image src={backdrop} alt="" fill sizes="100vw"
          className="object-cover opacity-25" priority />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 py-10">
        <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>

        <h2 className="text-lg md:text-2xl font-bold text-white max-w-md leading-tight">
          {lang === "mn" ? "Үргэлжлүүлэхийн тулд нэвтэрнэ үү" : "Sign in to continue"}
        </h2>
        <p className="text-sm text-white/65 mt-2 max-w-md line-clamp-2">
          {title
            ? (lang === "mn"
                ? `"${title}" үзэхийн тулд бүртгэлээ ашиглаарай`
                : `Sign in to watch "${title}"`)
            : (lang === "mn"
                ? "Бүртгэлтэй хаягаараа нэвтэрснээр контентыг үргэлжлүүлэн үзнэ"
                : "Sign in with your account to keep watching")}
        </p>

        <div className="flex items-center gap-2.5 mt-6 flex-wrap justify-center">
          <Link href={loginHref}
            className="px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-colors">
            {lang === "mn" ? "Нэвтрэх" : "Sign in"}
          </Link>
          <Link href={registerHref}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold transition-colors">
            {lang === "mn" ? "Бүртгүүлэх" : "Register"}
          </Link>
        </div>
      </div>
    </div>
  );
}
