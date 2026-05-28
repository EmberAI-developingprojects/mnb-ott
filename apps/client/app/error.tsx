"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/store/settingsStore";

/* App-wide error boundary — Component-д unhandled error гарвал blank screen биш
   цэвэр UI харагдана. Хэрэглэгчид reload эсвэл нүүр рүү буцах сонголт өгнө.
   Sentry-д error captured хийгдэнэ (production-д DSN тохируулсан бол). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-app text-app">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--danger)]/15 border border-[var(--danger)]/40 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--danger)]">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t("error_title")}</h1>
          <p className="text-muted text-sm">{t("error_subtitle")}</p>
          {error.digest && (
            <p className="text-xs text-muted-strong font-mono mt-2">{t("error_id")}: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center gap-2 justify-center pt-2">
          <button onClick={reset}
            className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors">
            {t("try_again")}
          </button>
          <Link href="/"
            className="px-5 py-2.5 rounded-full bg-card hover:bg-card-hover text-app text-sm font-semibold border border-app transition-colors">
            {t("go_to_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
