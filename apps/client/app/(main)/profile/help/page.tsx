"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

const FAQ_MN: { q: string; a: string }[] = [
  {
    q: "Plan хооронд ямар ялгаа байна вэ?",
    a: "BASIC plan нь үнэгүй бөгөөд YouTube архивыг хязгаарлалтгүй үзэх боломжтой. TV plan нь 5 суваг шууд + 2 цаг DVR catch-up. VOD plan нь Премиум видео санг бүхэлд нь үзэх боломж. COMBO нь дээрх бүгдийг нэгтгэсэн ХАМГИЙН ЗӨВ багц.",
  },
  {
    q: "Видео багц гэж юу вэ? Plan-тай ямар ялгаатай?",
    a: "Видео багц нь тематик цуглуулга. Plan-ийн дотор НЭГ Ч багц багтахгүй — багц доторх видеог нэг бүрчлэн худалдан авч 72 цагийн дотор үзнэ.",
  },
  {
    q: "Захиалгаа цуцалж болох уу?",
    a: "Тийм. Profile → Захиалга & Багц дотор 'Цуцлах' товч дарж BASIC plan руу шууд буцна. Үлдсэн төлбөр буцаахгүй.",
  },
  {
    q: "Хэдэн төхөөрөмж дээр зэрэг үзэх боломжтой вэ?",
    a: "BASIC: 1, TV: 2, VOD: 2, COMBO: 4 төхөөрөмж зэрэг үзэх боломжтой.",
  },
  {
    q: "QPay-аар хэрхэн төлбөр төлөх вэ?",
    a: "Plan-аа сонгоод 'Захиалах' дарвал QPay QR код гарна. QPay-тэй банкны аппаараа QR код уншуулж төлбөр төлөхөд автоматаар plan идэвхжинэ.",
  },
  {
    q: "DVR хэрхэн ажилладаг вэ?",
    a: "Live TV-г 2 цаг хүртэл ухрааж үзэх боломжтой. Player доторх timeline дээр scrub хийгээд хүссэн агшнаасаа эхэлж үзэж болно. TV эсвэл COMBO plan шаардлагатай.",
  },
  {
    q: "Хадгалсан видео хаашаа орох вэ?",
    a: "Дуртай видеогоо thumbnail дээр зүрх дарж хадгалсны дараа header дахь 'Дуртай' цэснээс үзэх боломжтой.",
  },
  {
    q: "Бүртгэлээ устгаж болох уу?",
    a: "Тийм. Profile → Тохиргоо → 'Аюултай хэсэг' → 'Бүртгэл устгах'. Устгасны дараа сэргээх боломжгүй гэдгийг анхаарна уу.",
  },
];

const FAQ_EN: { q: string; a: string }[] = [
  {
    q: "What's the difference between plans?",
    a: "BASIC is free and lets you watch the YouTube archive. TV plan includes 5 live channels + 2-hour DVR catch-up. VOD plan unlocks the entire Premium VOD library. COMBO bundles everything — the BEST VALUE plan.",
  },
  {
    q: "What's a Video Bundle? How is it different from a Plan?",
    a: "A Video Bundle is a curated collection. It is NOT included in any plan — each video inside a bundle must be rented individually for 72 hours via TVOD.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Go to Profile → Subscription and click 'Cancel' to downgrade to BASIC. The remaining period is not refunded.",
  },
  {
    q: "How many devices can I use simultaneously?",
    a: "BASIC: 1, TV: 2, VOD: 2, COMBO: 4 devices at the same time.",
  },
  {
    q: "How does QPay work?",
    a: "Select your plan and click 'Subscribe'. A QPay QR code will appear. Scan it with your bank's QPay-enabled app — your plan will activate automatically.",
  },
  {
    q: "How does DVR work?",
    a: "Live TV can be rewound up to 2 hours. Use the player's timeline to scrub to any moment. Requires the TV or COMBO plan.",
  },
  {
    q: "Where do I find my saved videos?",
    a: "Click the heart icon on any video to save it, then access them from the 'Watchlist' link in the header.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Go to Profile → Preferences → 'Danger zone' → 'Delete account'. Note: deletion is permanent and cannot be undone.",
  },
];

export default function HelpPage() {
  const { lang } = useSettingsStore();
  const faq = lang === "mn" ? FAQ_MN : FAQ_EN;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold text-app">
          {lang === "mn" ? "Түгээмэл асуулт" : "Help & FAQ"}
        </h1>
        <p className="text-sub mt-1 text-sm">
          {lang === "mn"
            ? "МНБ OTT-н тухай хамгийн их асуудаг асуултууд"
            : "Most common questions about МНБ OTT"}
        </p>
      </header>

      <div className="space-y-2">
        {faq.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}
              className={cn(
                "rounded-xl border transition-colors",
                isOpen ? "border-accent/40 bg-accent-soft" : "border-app bg-card",
              )}>
              <button onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left">
                <span className="text-sm font-semibold text-app">{item.q}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={cn("text-muted shrink-0 transition-transform", isOpen && "rotate-180")}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {isOpen && (
                <p className="px-4 pb-4 -mt-1 text-sm text-sub leading-relaxed">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
