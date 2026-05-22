"use client";

import { useSettingsStore } from "@/store/settingsStore";

export default function TermsPage() {
  const { lang } = useSettingsStore();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold text-app">
          {lang === "mn" ? "Үйлчилгээний нөхцөл" : "Terms of Service"}
        </h1>
        <p className="text-xs text-muted mt-1">
          {lang === "mn"
            ? "Сүүлд шинэчилсэн: 2026 оны 5 сарын 1"
            : "Last updated: May 1, 2026"}
        </p>
      </header>

      {lang === "mn" ? <TermsMn /> : <TermsEn />}
    </div>
  );
}

function TermsMn() {
  return (
    <article className="space-y-6 text-sm text-sub leading-relaxed">
      <Section title="1. Ерөнхий зүйл">
        <p>
          МНБ OTT (цаашид “Үйлчилгээ”) нь Монголын Үндэсний Олон Нийтийн Радио
          Телевизийн (МҮОНРТ) албан ёсны стриминг платформ юм. Үйлчилгээг
          ашигласнаар та доорх нөхцөлийг хүлээн зөвшөөрсөнд тооцогдоно.
        </p>
      </Section>

      <Section title="2. Бүртгэл">
        <p>
          Хэрэглэгч нь утасны дугаар, имэйл эсвэл Google бүртгэлээр нэг удаа
          бүртгүүлж нэвтэрнэ. Бүртгэлийн мэдээллийг үнэн зөв оруулах үүрэгтэй.
          Бүртгэлээ бусдад дамжуулахыг хориглоно.
        </p>
      </Section>

      <Section title="3. Захиалга, төлбөр">
        <p>
          Үйлчилгээ нь 4 төрлийн plan (BASIC, TV, VOD, COMBO)-той бөгөөд
          сар, 7 хоногийн захиалгын хэлбэрээр санал болгоно. QPay-аар төлбөр
          төлсний дараа plan нь идэвхжих ба хугацаа дуусахад автоматаар
          BASIC plan руу шилжинэ.
        </p>
        <p>
          Видео багц доторх контент нь plan-аас үл хамаараад тус бүрчлэн
          72 цагаар түрээслэгдэнэ. Түрээсийн хугацаа дуусахад дахин үзэх
          боломжгүй болно.
        </p>
      </Section>

      <Section title="4. Хэрэглэгчийн үүрэг">
        <p>
          Хэрэглэгч нь Үйлчилгээний контентыг хувийн зорилгоор үзэх эрхтэй.
          Контентыг хуулбарлах, дахин нийтлэх, арилжааны зорилгоор ашиглахыг
          хатуу хориглоно.
        </p>
      </Section>

      <Section title="5. Контент, оюуны өмчийн эрх">
        <p>
          Бүх контентын оюуны өмчийн эрх нь МҮОНРТ болон/эсвэл түншүүдэд
          харьяалагдана. Зөвшөөрөлгүйгээр ашиглахыг хориглоно.
        </p>
      </Section>

      <Section title="6. Бүртгэл устгах">
        <p>
          Хэрэглэгч ямар ч үед бүртгэлээ устгах эрхтэй. Устгасны дараа
          захиалгын мэдээлэл, худалдан авалтын түүх, мэдэгдэл бүгд устах
          бөгөөд сэргээх боломжгүй.
        </p>
      </Section>

      <Section title="7. Үйлчилгээ өөрчлөх">
        <p>
          МҮОНРТ нь Үйлчилгээ, plan, үнэ, нөхцөлийг хэдийд ч өөрчлөх эрхтэй.
          Үндсэн өөрчлөлтийг хэрэглэгчид имэйл болон мэдэгдлээр мэдэгдэнэ.
        </p>
      </Section>

      <Section title="8. Холбоо барих">
        <p>
          Асуудал, гомдол, санал хүсэлтийг
          <a href="mailto:support@mnb.mn" className="text-accent hover:underline ml-1">support@mnb.mn</a>
          {" "}хаяг руу илгээнэ үү.
        </p>
      </Section>
    </article>
  );
}

function TermsEn() {
  return (
    <article className="space-y-6 text-sm text-sub leading-relaxed">
      <Section title="1. General">
        <p>МНБ OTT is the official streaming platform of MNB. By using it you agree to these terms.</p>
      </Section>
      <Section title="2. Account">
        <p>Register via phone, email, or Google. Sharing accounts is prohibited.</p>
      </Section>
      <Section title="3. Subscriptions & Payments">
        <p>4 plans available via QPay. Plans expire and downgrade to BASIC automatically.</p>
        <p>Bundle videos are rented individually for 72 hours regardless of plan.</p>
      </Section>
      <Section title="4. User Obligations">
        <p>Content is for personal viewing only. Redistribution is prohibited.</p>
      </Section>
      <Section title="5. Intellectual Property">
        <p>All content is owned by MNB/partners.</p>
      </Section>
      <Section title="6. Account Deletion">
        <p>Account deletion is permanent and cannot be undone.</p>
      </Section>
      <Section title="7. Changes">
        <p>Terms may change with notice.</p>
      </Section>
      <Section title="8. Contact">
        <p>
          <a href="mailto:support@mnb.mn" className="text-accent hover:underline">support@mnb.mn</a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-app mb-2">{title}</h2>
      {children}
    </section>
  );
}
