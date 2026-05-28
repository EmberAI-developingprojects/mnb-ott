"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PlanDefinition, PlanType } from "@/types";

interface MySubscription {
  subscription: { planType: PlanType; status: string; expiresAt?: string };
  plan: PlanDefinition;
  isActive: boolean;
  plans: PlanDefinition[];
}

/* Шинэ загвар: зөвхөн VOD plan худалдан авах боломжтой
   (TV/Radio + архив нь BASIC plan-аар үнэгүй) */
const PURCHASABLE: PlanType[] = ["VOD"];

export default function ProfileSubscriptionPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { lang } = useSettingsStore();
  const t = useT();

  const [data, setData]       = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<"monthly" | "weekly">("monthly");
  const [pending, setPending] = useState<PlanType | null>(null);    // plan-аар тэмдэглэв
  const [confirm, setConfirm] = useState<PlanDefinition | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login?callbackUrl=/profile/subscription"); return; }
    refresh();
  }, [user, router]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await api.get<{ success: true; data: MySubscription }>("/api/subscription/me");
      setData(r.data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function activate(plan: PlanDefinition) {
    setPending(plan.type);
    setError(null);
    try {
      const r = await api.post<{ success: true; data: MySubscription }>("/api/subscription/activate", {
        planType: plan.type, period,
      });
      setData(r.data.data);
      setSuccess(plan.label);
      setConfirm(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setPending(null);
    }
  }

  async function cancelSubscription() {
    setPending("BASIC");
    setError(null);
    try {
      const r = await api.post<{ success: true; data: MySubscription }>("/api/subscription/cancel");
      setData(r.data.data);
      setCancelConfirm(false);
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      setPending(null);
    }
  }

  if (loading) return (
    <div className="py-16 flex justify-center">
      <div className="w-8 h-8 border-2 border-strong border-t-[var(--primary)] rounded-full animate-spin" />
    </div>
  );

  const plans   = data?.plans ?? [];
  const current = data?.subscription;
  const myPlan  = data?.plan;
  const expiry  = current?.expiresAt ? new Date(current.expiresAt) : null;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Success toast */}
      {success && (
        <div className="fixed top-20 right-6 z-50 surface-base rounded-xl px-4 py-3 shadow-pop animate-fade-in flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-app">{t("sub_activated")}</p>
            <p className="text-xs text-muted">{success}</p>
          </div>
        </div>
      )}

      {/* Одоогийн төлөв */}
      {myPlan && (
        <div className={cn(
          "rounded-2xl border p-6 flex items-start justify-between gap-4 flex-wrap",
          data?.isActive && myPlan.type !== "BASIC"
            ? "border-accent/40 bg-accent-soft"
            : "border-app bg-card",
        )}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
              {t("sub_current_plan")}
            </p>
            <h2 className="text-2xl font-bold text-app">{myPlan.label}</h2>
            {expiry && daysLeft !== null && myPlan.type !== "BASIC" && (
              <p className="text-xs text-muted mt-2.5">
                {lang === "mn"
                  ? <>Дуусах: <span className="text-app font-medium">
                      {expiry.toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" })}
                    </span> · {daysLeft} өдөр үлдсэн</>
                  : <>Renews: <span className="text-app font-medium">
                      {expiry.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span> · {daysLeft} days left</>}
              </p>
            )}
          </div>

          {/* Cancel button (only if user has paid plan) */}
          {myPlan.type !== "BASIC" && data?.isActive && (
            <button onClick={() => setCancelConfirm(true)}
              className="text-xs font-medium text-muted hover:text-[var(--danger)] transition-colors">
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-danger-soft px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Period toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-card p-1 rounded-xl border border-app">
          {(["monthly", "weekly"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                period === p ? "bg-accent text-white" : "text-sub hover:text-app",
              )}>
              {p === "monthly" ? t("sub_monthly") : t("sub_weekly")}
            </button>
          ))}
        </div>
      </div>

      {/* 2 plan grid — шинэ загвар (BASIC + VOD) */}
      <div className="grid sm:grid-cols-2 gap-4">
        {plans.filter((p) => p.type === "BASIC" || PURCHASABLE.includes(p.type)).map((plan) => {
          const price     = period === "monthly" ? plan.priceMonthly : plan.priceWeekly;
          const isCurrent = current?.planType === plan.type;
          const isBasic   = plan.type === "BASIC";
          const isPending = pending === plan.type;

          return (
            <div key={plan.type}
              className={cn(
                "relative rounded-2xl border p-5 flex flex-col gap-4 transition-all",
                isCurrent
                  ? "border-accent bg-accent-soft"
                  : "border-app bg-card",
              )}>

              <div>
                <p className="text-[11px] font-bold text-muted uppercase tracking-[0.15em]">{plan.label}</p>
                <p className="text-xs text-sub mt-1.5 min-h-[32px] leading-snug">{plan.tagline}</p>
              </div>

              <div>
                {price === 0 ? (
                  <p className="text-3xl font-bold text-app">{t("sub_free_label")}</p>
                ) : (
                  <p className="text-3xl font-bold text-app">
                    {price.toLocaleString(lang === "mn" ? "mn-MN" : "en-US")}
                    <span className="text-muted text-sm font-medium ml-1">
                      ₮/{period === "monthly" ? t("sub_per_month") : t("sub_per_week")}
                    </span>
                  </p>
                )}
                <p className="text-xs text-muted mt-1">
                  {plan.deviceLimit} {t("sub_devices_at")}
                </p>
              </div>

              {/* Шинэ загварт зөвхөн premium VOD capability ялгаатай —
                  үлдсэн (TV/Radio/Archive) нь бүх plan-д free */}
              <div className="space-y-1.5">
                <CapRow on label={t("caps_tv_radio_dvr")} />
                <CapRow on label={t("caps_yt_archive")} />
                <CapRow on={plan.capabilities.premiumVod} label={t("caps_vod_lib")} />
              </div>

              <ul className="space-y-1.5 flex-1 pt-3 border-t border-app">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-sub">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5 text-accent">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (isCurrent || isBasic) return;
                  setConfirm(plan);
                }}
                disabled={isCurrent || isBasic || isPending}
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50",
                  isCurrent
                    ? "bg-card border border-app text-muted cursor-default"
                    : isBasic
                      ? "bg-card border border-app text-muted cursor-default"
                      : "bg-accent hover:bg-accent-hover text-white",
                )}>
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t("sub_waiting")}
                  </span>
                ) : isCurrent
                  ? t("sub_current_plan")
                  : isBasic
                    ? t("sub_free_label")
                    : t("sub_subscribe")}
              </button>
            </div>
          );
        })}
      </div>

      {/* LIVE event PPV-ийн тайлбар */}
      <div className="rounded-2xl border border-app bg-card p-5 space-y-2">
        <p className="text-[11px] font-bold text-muted uppercase tracking-[0.15em]">{t("live_events")}</p>
        <p className="text-sm text-sub leading-relaxed">{t("live_events_desc")}</p>
      </div>

      {/* Confirm modal — t() interpolation-аар {label} + {price} оруулдаг. */}
      {confirm && (() => {
        const priceN  = period === "monthly" ? confirm.priceMonthly : confirm.priceWeekly;
        const price   = priceN.toLocaleString(lang === "mn" ? "mn-MN" : "en-US");
        const bodyKey = period === "monthly" ? "sub_confirm_body_monthly" : "sub_confirm_body_weekly";
        return (
          <ConfirmDialog
            title={t("sub_confirm_title", { label: confirm.label })}
            body={t(bodyKey, { price })}
            confirmLabel={t("activate")}
            cancelLabel={t("cancel_short")}
            confirmDanger={false}
            loading={pending === confirm.type}
            onConfirm={() => activate(confirm)}
            onCancel={() => setConfirm(null)}
          />
        );
      })()}

      {/* Cancel confirm */}
      {cancelConfirm && (
        <ConfirmDialog
          title={t("sub_cancel_title")}
          body={t("sub_cancel_body")}
          confirmLabel={t("cancel_plan")}
          cancelLabel={t("keep_plan")}
          confirmDanger
          loading={pending === "BASIC"}
          onConfirm={cancelSubscription}
          onCancel={() => setCancelConfirm(false)}
        />
      )}
    </div>
  );
}

/* ───────────────────────────────────────── helpers ───────────────────────────────────────── */
function CapRow({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {on ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent shrink-0">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-strong shrink-0">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      )}
      <span className={cn("font-medium", on ? "text-app" : "text-muted line-through")}>{label}</span>
    </div>
  );
}

function ConfirmDialog({
  title, body, confirmLabel, cancelLabel, confirmDanger, loading, onConfirm, onCancel,
}: {
  title: string; body: string;
  confirmLabel: string; cancelLabel: string;
  confirmDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overlay-bg backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}>
      <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-pop animate-scale-in"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-app">{title}</h2>
        <p className="text-sm text-sub leading-relaxed">{body}</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-card border border-app text-sm font-semibold text-app hover:bg-card-hover transition-colors disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50",
              confirmDanger
                ? "bg-[var(--danger)] hover:opacity-90"
                : "bg-accent hover:bg-accent-hover",
            )}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
