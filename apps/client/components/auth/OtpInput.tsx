"use client";

import { useRef, useState, useEffect, useImperativeHandle, forwardRef, KeyboardEvent, ClipboardEvent } from "react";

export interface OtpInputRef { reset: () => void; }

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(
  function OtpInput({ length = 6, onComplete, disabled, hasError }, ref) {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    /* Focus-ийн setTimeout-ийг ref-д хадгалж unmount/re-run дээр цэвэрлэнэ —
       unmounted input дээр focus оролдохоос сэргийлнэ. */
    const focusTimer = useRef<ReturnType<typeof setTimeout>>();
    const focusFirst = () => {
      clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => inputs.current[0]?.focus(), 50);
    };

    useEffect(() => {
      inputs.current[0]?.focus();
      return () => clearTimeout(focusTimer.current);
    }, []);

    // Error болоход автоматаар цэвэрлэх
    useEffect(() => {
      if (hasError) {
        setValues(Array(length).fill(""));
        focusFirst();
      }
    }, [hasError, length]);

    // Гаднаас reset дуудах боломж
    useImperativeHandle(ref, () => ({
      reset: () => {
        setValues(Array(length).fill(""));
        focusFirst();
      },
    }));

    function handleChange(i: number, val: string) {
      if (!/^\d*$/.test(val)) return;
      const next = [...values];
      next[i] = val.slice(-1);
      setValues(next);
      if (val && i < length - 1) inputs.current[i + 1]?.focus();
      if (next.join("").length === length) onComplete(next.join(""));
    }

    function handleKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Backspace" && !values[i] && i > 0) inputs.current[i - 1]?.focus();
    }

    function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      const next = [...values];
      pasted.split("").forEach((ch, idx) => { next[idx] = ch; });
      setValues(next);
      inputs.current[Math.min(pasted.length, length - 1)]?.focus();
      if (pasted.length === length) onComplete(pasted);
    }

    return (
      <div className="flex gap-2.5 justify-center">
        {values.map((val, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            className={[
              "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all select-none font-mono",
              hasError
                ? "bg-red-500/10 border-red-500/50 text-red-400 focus:border-red-400"
                : val
                  ? "bg-accent/20 border-accent text-app focus:border-accent"
                  : "bg-input border-strong text-app focus:border-accent",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            ].filter(Boolean).join(" ")}
          />
        ))}
      </div>
    );
  }
);
