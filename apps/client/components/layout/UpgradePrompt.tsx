"use client";

import Link from "next/link";
import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  kind:    "live-tv" | "library" | "bundle";
  /** Bundle видео — тус бүрчлэн худалдан авах ID/үнэ/гарчиг */
  vodId?:  string;
  price?:  number;
  title?:  string;
  backdrop?: string;
}

const KIND_TEXT = {
  "live-tv": {
    mn: { title: "Шууд цацалт үзэхийн тулд",     sub: "TV эсвэл COMBO багц шаардлагатай" },
    en: { title: "To watch live TV",              sub: "TV or COMBO plan required" },
  },
  "library": {
    mn: { title: "Энэ видеог үзэхийн тулд",       sub: "VOD эсвэл COMBO багц шаардлагатай" },
    en: { title: "To watch this video",            sub: "VOD or COMBO plan required" },
  },
  "bundle": {
    mn: { title: "Энэ видеог үзэхийн тулд",       sub: "Тус бүрчлэн худалдан авна — 72 цагийн дотор үзнэ" },
    en: { title: "To watch this video",            sub: "Rent for 72 hours" },
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

export function UpgradePrompt({ kind, vodId, price, title, backdrop }: Props) {
  const { lang } = useSettingsStore();
  const text = KIND_TEXT[kind][lang];

  const [qpay, setQpay]     = useState<InvoiceData | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function rentVideo() {
    if (!vodId || !price) return;
    setPaying(true); setError(null);
    try {
      const r = await api.post<{ success: true; data: InvoiceData }>(
        "/api/payment/vod-invoice",
        { vodId, price, title },
      );

      /* Mock mode — шууд төлбөр амжилттай гэж тооцох → reload */
      if (r.data.data.mock && r.data.data.paid) {
        window.location.reload();
        return;
      }

      /* Бодит QPay — QR modal харуулаад polling */
      setQpay(r.data.data);
      const iv = setInterval(async () => {
        try {
          const res = await api.post<{ success: true; data: { paid: boolean } }>(
            "/api/payment/check", { invoiceId: r.data.data.invoiceId });
          if (res.data.data.paid) {
            clearInterval(iv);
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
          <img src={backdrop} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="text-lg md:text-2xl font-bold text-white max-w-md leading-tight">{text.title}</h2>
          <p className="text-sm text-white/65 mt-2 max-w-md">{text.sub}</p>

          {kind === "bundle" && price ? (
            <p className="mt-4 text-3xl font-bold text-accent">
              {price.toLocaleString("mn-MN")}<span className="text-base text-white/60 font-normal ml-1">₮</span>
            </p>
          ) : null}

          {error && (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          )}

          <div className="flex items-center gap-2.5 mt-6 flex-wrap justify-center">
            {kind === "bundle" ? (
              <button
                onClick={rentVideo}
                disabled={paying || !vodId || !price}
                className={cn(
                  "px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}>
                {paying ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {lang === "mn" ? "Үүсгэж байна..." : "Creating..."}
                  </span>
                ) : (
                  lang === "mn" ? "Худалдаж авах" : "Rent video"
                )}
              </button>
            ) : (
              <Link href="/profile/subscription"
                className="px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-colors">
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
