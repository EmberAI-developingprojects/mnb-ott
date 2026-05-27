"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  /* live-tv: хуучин TV plan. Шинэ загварт энэ нь нэвтэрсэн бүхэнд free тул UI-д
     ашиглагдахгүй боловч type-ийн тулд үлдсэн.
     library: премиум VOD plan шаардлагатай
     bundle:  bundle item TVOD (72 цаг)
     live:    LIVE event PPV (24 цаг, Channel.id-аар) */
  kind:       "live-tv" | "library" | "bundle" | "live";
  /** Bundle видео — тус бүрчлэн худалдан авах ID/үнэ/гарчиг */
  vodId?:     string;
  /** LIVE PPV — channel ID + цолоор сонгох үнэ */
  channelId?: string;
  price?:     number;
  title?:     string;
  backdrop?:  string;
}

const KIND_TEXT = {
  "live-tv": {
    mn: { title: "Бүртгэлтэй хэрэглэгчид үзэх боломжтой",  sub: "(үнэгүй)" },
    en: { title: "To watch live TV",          sub: "Please log in (free)" },
  },
  "library": {
    mn: { title: "Энэ видеог үзэхийн тулд",   sub: "VOD захиалга шаардлагатай" },
    en: { title: "To watch this video",       sub: "VOD subscription required" },
  },
  "bundle": {
    mn: { title: "Энэ видеог үзэхийн тулд",   sub: "72 цагаар түрээслэнэ" },
    en: { title: "To watch this video",       sub: "Rent for 72 hours" },
  },
  "live": {
    mn: { title: "Энэ LIVE-ыг үзэхийн тулд",  sub: "24 цагийн дотор үзнэ" },
    en: { title: "To watch this LIVE",        sub: "Access for 24 hours" },
  },
};

interface InvoiceData {
  mock?:    boolean;
  paid?:    boolean;
  invoiceId: string;
  qrImage?: string;
  deeplinks?: { name: string; link: string; logo: string }[];
  amount: number;
}

export function UpgradePrompt({ kind, vodId, channelId, price, title, backdrop }: Props) {
  const { lang } = useSettingsStore();
  const { user } = useAuthStore();
  const pathname = usePathname();
  const text = KIND_TEXT[kind][lang];
  /* TV/Radio болон Архив нь нэвтэрсэн бүхэнд free. Тиймээс энэ prompt нь зөвхөн
     "нэвтрэлт хэрэгтэй" утгатай — "Багц авах" биш "Нэвтрэх"-ийн товч харуулна. */
  const isLoginPrompt = !user && kind === "live-tv";

  const [qpay, setQpay]     = useState<InvoiceData | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  /* Polling timer ref — modal хаагдах, унтрах, эсвэл component unmount үед
     зайлшгүй цэвэрлэх ёстой (өмнө memory leak + олон concurrent polling-тай байсан). */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }
  useEffect(() => () => stopPolling(), []);    /* unmount → cleanup */
  useEffect(() => { if (!qpay) stopPolling(); }, [qpay]);  /* modal хаагдсан үед */

  /* Single purchase flow — bundle (VOD invoice) vs live (Live invoice).
     Mock горимд шууд PAID болж reload. Production-д QR + polling. */
  async function purchase() {
    stopPolling();
    setPaying(true); setError(null);
    try {
      let r;
      if (kind === "bundle") {
        if (!vodId || !price) return;
        r = await api.post<{ success: true; data: InvoiceData }>(
          "/api/payment/vod-invoice", { vodId, price, title },
        );
      } else if (kind === "live") {
        if (!channelId) return;
        r = await api.post<{ success: true; data: InvoiceData }>(
          "/api/payment/live-invoice", { channelId },
        );
      } else return;

      if (r.data.data.mock && r.data.data.paid) {
        window.location.reload();
        return;
      }
      setQpay(r.data.data);
      const invoiceId = r.data.data.invoiceId;
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.post<{ success: true; data: { paid: boolean } }>(
            "/api/payment/check", { invoiceId });
          if (res.data.data.paid) {
            stopPolling();
            window.location.reload();
          }
        } catch { /* silent */ }
      }, 3000);
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-card">
        {backdrop && (
          <Image src={backdrop} alt="" fill sizes="100vw"
            className="object-cover opacity-75" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 sm:px-6 py-4 sm:py-10">
          {/* Lock icon — mobile-д зай багатай тул нуугдана */}
          <div className="hidden sm:flex w-14 h-14 rounded-full bg-accent/20 border border-accent/40 items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="text-white text-sm sm:text-lg font-bold line-clamp-2 px-2">{text.title}</h2>
          <p className="text-white/70 text-[11px] sm:text-sm mt-0.5 sm:mt-1">{text.sub}</p>

          {(kind === "bundle" || kind === "live") && price ? (
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-accent">
              {price.toLocaleString("mn-MN")}<span className="text-xs sm:text-base text-white/60 font-normal ml-1">₮</span>
            </p>
          ) : null}

          {error && (
            <p className="mt-2 text-xs sm:text-sm text-[var(--danger)]">{error}</p>
          )}

          <div className="flex items-center gap-2.5 mt-3 sm:mt-6 flex-wrap justify-center">
            {kind === "bundle" || kind === "live" ? (
              <button
                onClick={purchase}
                disabled={paying || (kind === "bundle" ? (!vodId || !price) : !channelId)}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-bold transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}>
                {paying ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {lang === "mn" ? "Үүсгэж байна..." : "Creating..."}
                  </span>
                ) : kind === "bundle"
                  ? (lang === "mn" ? "Түрээслэх" : "Rent video")
                  : (lang === "mn" ? "Худалдан авч үзэх" : "Purchase to watch")}
              </button>
            ) : isLoginPrompt ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`}
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-bold transition-colors">
                {lang === "mn" ? "Нэвтрэх" : "Log in"}
              </Link>
            ) : (
              <Link href="/profile/subscription"
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-bold transition-colors">
                {lang === "mn" ? "Багц авах" : "Subscribe"}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* QPay modal */}
      {qpay && (
        <div className="fixed inset-0 z-50 overlay-bg backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setQpay(null)}>
          <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-pop animate-scale-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">
                {lang === "mn" ? "QPay төлбөр" : "QPay Payment"}
              </h2>
              <button onClick={() => setQpay(null)}
                className="text-muted hover:text-app transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {qpay.qrImage && (
              <div className="bg-white rounded-xl p-3 flex items-center justify-center">
                <img src={`data:image/png;base64,${qpay.qrImage}`} alt="QPay QR" className="w-48 h-48" />
              </div>
            )}
            <p className="text-center text-sm text-muted">
              {lang === "mn" ? "QPay апп-аар уншуулж" : "Scan with QPay app —"}{" "}
              <span className="text-app font-semibold">{qpay.amount.toLocaleString("mn-MN")}₮</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-muted justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {lang === "mn" ? "Төлбөр хүлээж байна..." : "Waiting for payment..."}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
