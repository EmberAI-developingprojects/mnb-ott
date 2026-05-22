"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";

type Doc = "terms" | "privacy";

/**
 * Auth хуудаст харагдах "үйлчилгээний нөхцөл, нууцлалын бодлого"
 * link-үүд. Click дарвал шинэ хуудас руу залуурахгүй modal-аар нээгдэнэ.
 */
export function LegalLinks() {
  const { lang } = useSettingsStore();
  const [open, setOpen] = useState<Doc | null>(null);

  return (
    <>
      <p className="text-[11px] text-muted text-center leading-relaxed">
        {lang === "mn" ? "Бүртгүүлснээр та" : "By registering, you agree to our"}{" "}
        <button onClick={() => setOpen("terms")}
          className="text-accent hover:underline font-medium">
          {lang === "mn" ? "үйлчилгээний нөхцөл" : "Terms of Service"}
        </button>
        {" "}{lang === "mn" ? "ба" : "and"}{" "}
        <button onClick={() => setOpen("privacy")}
          className="text-accent hover:underline font-medium">
          {lang === "mn" ? "нууцлалын бодлогыг" : "Privacy Policy"}
        </button>
        {" "}{lang === "mn" ? "зөвшөөрнө." : ""}
      </p>

      {open && <LegalModal doc={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function LegalModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const { lang } = useSettingsStore();
  return (
    <div className="fixed inset-0 z-50 overlay-bg backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}>
      <div className="surface-base rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-pop animate-scale-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-app">
          <h2 className="text-lg font-bold text-app">
            {doc === "terms"
              ? (lang === "mn" ? "Үйлчилгээний нөхцөл" : "Terms of Service")
              : (lang === "mn" ? "Нууцлалын бодлого" : "Privacy Policy")}
          </h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-card-hover flex items-center justify-center text-muted hover:text-app transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-sm text-sub leading-relaxed space-y-4">
          {doc === "terms" ? <TermsBody lang={lang} /> : <PrivacyBody lang={lang} />}
        </div>

        <div className="px-6 py-4 border-t border-app">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-colors">
            {lang === "mn" ? "Ойлголоо" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsBody({ lang }: { lang: "mn" | "en" }) {
  if (lang === "mn") return (
    <>
      <Section title="1. Ерөнхий">
        <p>МНБ OTT нь МҮОНРТ-ийн албан ёсны стриминг платформ. Үйлчилгээг ашигласнаар та нөхцөлийг хүлээн зөвшөөрнө.</p>
      </Section>
      <Section title="2. Захиалга, төлбөр">
        <p>4 plan (BASIC, TV, VOD, COMBO) сар/7 хоногийн захиалга. QPay-аар төлбөр төлсний дараа plan идэвхжинэ.</p>
        <p>Видео багц доторх контентыг тус бүрчлэн 72 цагаар түрээслэнэ.</p>
      </Section>
      <Section title="3. Бүртгэл устгах">
        <p>Хэрэглэгч ямар ч үед бүртгэлээ устгах эрхтэй. Устгасны дараа бүх өгөгдөл цэвэрлэгдэнэ.</p>
      </Section>
      <Section title="4. Холбоо барих">
        <p>Асуудал: <a href="mailto:support@mnb.mn" className="text-accent">support@mnb.mn</a></p>
      </Section>
    </>
  );
  return (
    <>
      <Section title="1. General">
        <p>МНБ OTT is the official streaming service of MNB. By using the service you agree to these terms.</p>
      </Section>
      <Section title="2. Subscription & Payment">
        <p>4 plans (BASIC, TV, VOD, COMBO) via monthly/weekly QPay billing.</p>
        <p>Bundle videos are rented individually for 72 hours.</p>
      </Section>
      <Section title="3. Account Deletion">
        <p>You may delete your account at any time. All data will be permanently erased.</p>
      </Section>
      <Section title="4. Contact">
        <p><a href="mailto:support@mnb.mn" className="text-accent">support@mnb.mn</a></p>
      </Section>
    </>
  );
}

function PrivacyBody({ lang }: { lang: "mn" | "en" }) {
  if (lang === "mn") return (
    <>
      <Section title="1. Цуглуулдаг мэдээлэл">
        <ul className="list-disc list-inside space-y-1">
          <li>Бүртгэл: утас/имэйл, нэр</li>
          <li>Төхөөрөмж: device ID, IP хаяг</li>
          <li>Үзлэгийн түүх</li>
          <li>Төлбөрийн түүх</li>
        </ul>
      </Section>
      <Section title="2. Ашиглах зорилго">
        <p>Үйлчилгээ үзүүлэх, төлбөр боловсруулах, контент санал болгох.</p>
      </Section>
      <Section title="3. Хуваалцах">
        <p>QPay (төлбөр), Google (OAuth) гадуур гуравдагч этгээдэд дамжуулахгүй.</p>
      </Section>
      <Section title="4. Аюулгүй байдал">
        <p>HTTPS + bcrypt шифрлэлт. Нууц үг ил харагдахгүй.</p>
      </Section>
    </>
  );
  return (
    <>
      <Section title="1. Data Collected">
        <ul className="list-disc list-inside space-y-1">
          <li>Account: phone/email, name</li>
          <li>Device: device ID, IP</li>
          <li>Viewing history</li>
          <li>Payment history</li>
        </ul>
      </Section>
      <Section title="2. Use">
        <p>Provide service, process payments, recommend content.</p>
      </Section>
      <Section title="3. Sharing">
        <p>QPay (payments), Google (OAuth) only.</p>
      </Section>
      <Section title="4. Security">
        <p>HTTPS + bcrypt encryption.</p>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[15px] font-bold text-app mb-1.5">{title}</h3>
      {children}
    </section>
  );
}
