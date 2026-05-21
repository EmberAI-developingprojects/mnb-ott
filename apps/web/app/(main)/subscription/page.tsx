"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useT } from "@/store/settingsStore";
import api, { getApiError } from "@/lib/api";

interface Plan {
  type: string; label: string;
  priceMonthly: number; priceWeekly: number;
  deviceLimit: number; features: string[];
}
interface MySubscription {
  subscription: { planType: string; status: string; expiresAt?: string };
  plan: Plan; isActive: boolean; plans: Plan[];
}
interface QPayData {
  paymentId: string; invoiceId: string;
  qrImage: string; qrText: string;
  deeplinks: { name: string; link: string; logo: string }[]; amount: number;
}

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const t = useT();

  const [data, setData]         = useState<MySubscription | null>(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState<"monthly" | "weekly">("monthly");
  const [qpay, setQpay]         = useState<QPayData | null>(null);
  const [paying, setPaying]     = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login?callbackUrl=/subscription"); return; }
    api.get<{ success: true; data: MySubscription }>("/api/subscription/me")
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (!qpay) return;
    const iv = setInterval(async () => {
      try {
        const r = await api.post<{ success: true; data: { paid: boolean } }>("/api/payment/check", { invoiceId: qpay.invoiceId });
        if (r.data.data.paid) {
          clearInterval(iv); setQpay(null);
          const r2 = await api.get<{ success: true; data: MySubscription }>("/api/subscription/me");
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

  async function handleCancel() {
    if (!qpay) return;
    setChecking(true);
    try { await api.delete(`/api/payment/invoice/${qpay.invoiceId}`); }
    catch { /* silent */ }
    finally { setQpay(null); setChecking(false); }
  }

  if (loading) return (
    <div className="max-w-[900px] mx-auto px-4 py-16 flex justify-center">
      <div className="w-8 h-8 border-2 border-[var(--border-strong)] border-t-[#0046A5] rounded-full animate-spin" />
    </div>
  );

  const plans = data?.plans ?? [];
  const current = data?.subscription;

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-app">{t("sub_title")}</h1>
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
              className={`relative rounded-2xl border p-6 space-y-5 flex flex-col ${
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
                <p className="text-sm font-semibold text-muted uppercase tracking-wider">{plan.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  {price === 0 ? (
                    <span className="text-3xl font-bold text-app">{t("sub_free_label")}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-app">{price.toLocaleString("mn-MN")}</span>
                      <span className="text-muted text-sm mb-1">
                        ₮/{period === "monthly" ? t("sub_per_month") : t("sub_per_week")}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">{plan.deviceLimit} {t("sub_devices_at")}</p>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0046A5" strokeWidth="2.5" className="shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button onClick={() => handleSubscribe(plan.type)}
                disabled={isCurrent || plan.type === "FREE" || paying}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                  isCurrent
                    ? "bg-[var(--border-strong)] text-muted cursor-default"
                    : isPremium
                      ? "bg-[#0046A5] hover:bg-blue-600 text-white"
                      : "bg-card hover:bg-[var(--border-strong)] text-app border border-app"
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
          <div className="surface-base rounded-2xl p-6 w-full max-w-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-app">{t("qpay_title")}</h2>
              <button onClick={handleCancel} disabled={checking}
                className="text-muted hover:text-app transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl p-3 flex items-center justify-center">
              <img src={`data:image/png;base64,${qpay.qrImage}`} alt="QPay QR" className="w-48 h-48" />
            </div>

            <p className="text-center text-sm text-muted">
              {t("qpay_scan")} <span className="text-app font-semibold">{qpay.amount.toLocaleString()}₮</span>
            </p>

            {qpay.deeplinks.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {qpay.deeplinks.slice(0, 4).map((dl) => (
                  <a key={dl.name} href={dl.link}
                    className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-[var(--border-strong)] rounded-lg transition-colors">
                    {dl.logo && <img src={dl.logo} alt={dl.name} className="w-5 h-5 rounded" />}
                    <span className="text-xs text-muted truncate">{dl.name}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted justify-center">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {t("qpay_waiting")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
