"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";

interface Plan {
  type: string; label: string;
  priceMonthly: number; priceWeekly: number;
  deviceLimit: number; features: string[];
}
interface SubDetail {
  subscription: { planType: string; status: string; expiresAt?: string };
  plan: Plan; isActive: boolean; plans: Plan[];
}
interface QPayData {
  paymentId: string; invoiceId: string;
  qrImage: string; deeplinks: { name: string; link: string; logo: string }[]; amount: number;
}

export default function ProfileSubscriptionPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [data, setData]       = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<"monthly" | "weekly">("monthly");
  const [qpay, setQpay]       = useState<QPayData | null>(null);
  const [paying, setPaying]   = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<{ success: true; data: SubDetail }>("/api/subscription/me")
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!qpay) return;
    const iv = setInterval(async () => {
      try {
        const r = await api.post<{ success: true; data: { paid: boolean } }>("/api/payment/check", { invoiceId: qpay.invoiceId });
        if (r.data.data.paid) {
          clearInterval(iv); setQpay(null);
          const r2 = await api.get<{ success: true; data: SubDetail }>("/api/subscription/me");
          setData(r2.data.data);
        }
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(iv);
  }, [qpay?.invoiceId]);

  async function handleSubscribe(planType: string) {
    if (planType === "FREE") return;
    setPaying(true);
    try {
      const r = await api.post<{ success: true; data: QPayData }>("/api/payment/invoice", { planType, period });
      setQpay(r.data.data);
    } catch (e) { alert(getApiError(e).message); }
    finally { setPaying(false); }
  }

  if (loading) return <div className="h-48 bg-surface rounded-2xl animate-pulse" />;

  const plans = data?.plans ?? [];
  const current = data?.subscription;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-app">{t("sub_title")}</h1>
        {current && (
          <p className="text-sm text-muted mt-1">
            {t("sub_current")}: <span className="text-sub font-medium">{current.planType}</span>
            {current.expiresAt && (
              <> · {new Date(current.expiresAt).toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" })} {t("sub_until")}</>
            )}
          </p>
        )}
      </div>

      {/* Period toggle */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl w-fit border border-app">
        {(["monthly", "weekly"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p ? "bg-[#0046A5] text-white" : "text-muted hover:text-app"
            }`}>
            {p === "monthly" ? t("sub_monthly") : t("sub_weekly")}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const price = period === "monthly" ? plan.priceMonthly : plan.priceWeekly;
          const isCurrent = current?.planType === plan.type;
          const isPremium = plan.type === "PREMIUM";
          return (
            <div key={plan.type}
              className={`relative rounded-2xl border p-5 space-y-4 flex flex-col ${
                isPremium ? "border-[#0046A5]/40 bg-[#0046A5]/6" : "border-app bg-surface"
              }`}>
              {isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#0046A5] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t("sub_featured")}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">{plan.label}</p>
                <div className="flex items-end gap-1 mt-1.5">
                  {price === 0
                    ? <span className="text-2xl font-bold text-app">{t("sub_free_label")}</span>
                    : <>
                        <span className="text-2xl font-bold text-app">{price.toLocaleString()}</span>
                        <span className="text-muted text-sm mb-0.5">
                          ₮/{period === "monthly" ? t("sub_per_month") : t("sub_per_week")}
                        </span>
                      </>
                  }
                </div>
                <p className="text-xs text-muted mt-0.5">{plan.deviceLimit} {t("sub_devices_at")}</p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0046A5" strokeWidth="2.5" className="shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleSubscribe(plan.type)}
                disabled={isCurrent || plan.type === "FREE" || paying}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                  isCurrent
                    ? "bg-[var(--border-strong)] text-muted cursor-default"
                    : isPremium
                      ? "bg-[#0046A5] hover:bg-blue-600 text-white"
                      : "bg-[var(--card)] hover:bg-[var(--border-strong)] text-app border border-app"
                }`}>
                {isCurrent ? t("sub_current_plan")
                  : plan.type === "FREE" ? t("sub_active")
                  : paying ? t("sub_waiting")
                  : t("sub_subscribe")}
              </button>
            </div>
          );
        })}
      </div>

      {/* QPay modal */}
      {qpay && (
        <div className="fixed inset-0 overlay-bg backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">{t("qpay_title")}</h2>
              <button onClick={() => setQpay(null)} className="text-muted hover:text-app transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="bg-white rounded-xl p-3 flex items-center justify-center">
              <img src={`data:image/png;base64,${qpay.qrImage}`} alt="QPay QR" className="w-44 h-44" />
            </div>
            <p className="text-center text-sm text-muted">
              {t("qpay_scan")} <span className="text-app font-semibold">{qpay.amount.toLocaleString()}₮</span> {t("sub_subscribe").toLowerCase()}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {qpay.deeplinks.slice(0, 4).map((dl) => (
                <a key={dl.name} href={dl.link}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--card)] hover:bg-[var(--border-strong)] rounded-lg text-xs text-muted truncate transition-colors">
                  {dl.logo && <img src={dl.logo} alt="" className="w-4 h-4 rounded shrink-0" />}
                  {dl.name}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-center text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {t("qpay_waiting")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
