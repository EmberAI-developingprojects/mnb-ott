"use client";

import { useEffect } from "react";

/* Admin error boundary */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-bg text-fg">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-danger/15 border border-danger/40 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Алдаа гарлаа</h1>
          <p className="text-muted text-sm">
            Admin үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.
          </p>
          {error.digest && (
            <p className="text-xs text-muted font-mono mt-2">ID: {error.digest}</p>
          )}
        </div>
        <button onClick={reset}
          className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors">
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}
