"use client";

import { useSettingsStore } from "@/store/settingsStore";

export default function PrivacyPage() {
  const { lang } = useSettingsStore();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-bold text-app">
          {lang === "mn" ? "Нууцлалын бодлого" : "Privacy Policy"}
        </h1>
        <p className="text-xs text-muted mt-1">
          {lang === "mn"
            ? "Сүүлд шинэчилсэн: 2026 оны 5 сарын 1"
            : "Last updated: May 1, 2026"}
        </p>
      </header>

      {lang === "mn" ? <PrivacyMn /> : <PrivacyEn />}
    </div>
  );
}

function PrivacyMn() {
  return (
    <article className="space-y-6 text-sm text-sub leading-relaxed">
      <Section title="1. Цуглуулдаг мэдээлэл">
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Бүртгэлийн мэдээлэл: утасны дугаар, имэйл, нэр, аватар</li>
          <li>Төхөөрөмжийн мэдээлэл: device ID, IP хаяг, browser төрөл</li>
          <li>Үзлэгийн түүх: үзсэн видео, үргэлжлэх хугацаа, position</li>
          <li>Төлбөрийн түүх: захиалгын хэлбэр, дүн, QPay invoice ID</li>
        </ul>
      </Section>

      <Section title="2. Ашиглах зорилго">
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Үйлчилгээ үзүүлэх, контент санал болгох</li>
          <li>Төлбөр боловсруулах, plan идэвхжүүлэх</li>
          <li>Аюулгүй байдлыг хангах, луйврыг таних</li>
          <li>Үйлчилгээний чанарыг сайжруулах</li>
        </ul>
      </Section>

      <Section title="3. Гуравдагч этгээдтэй хуваалцах">
        <p>Бид таны хувийн мэдээллийг гуравдагч этгээдэд зарж, дамжуулахгүй. Зөвхөн дараах тохиолдолд хуваалцана:</p>
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>QPay — төлбөр боловсруулахад</li>
          <li>Google — OAuth нэвтрэлтэд</li>
          <li>Хууль зүйн шаардлагаар албан байгууллагад</li>
        </ul>
      </Section>

      <Section title="4. Cookie ба tracking">
        <p>Бид session token, theme preference, language preference хадгалахад cookie/localStorage ашигладаг. Хувийн мэдээлэл хадгалахгүй.</p>
      </Section>

      <Section title="5. Таны эрх">
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Мэдээллээ үзэх, шинэчлэх</li>
          <li>Бүртгэлээ устгах (бүх мэдээлэл цэвэрлэгдэнэ)</li>
          <li>Mаркетингийн мэдэгдэлээс татгалзах</li>
        </ul>
      </Section>

      <Section title="6. Хадгалалт, аюулгүй байдал">
        <p>Мэдээллийг шифрлэлттэй (HTTPS, bcrypt) хадгална. Нууц үг нь bcrypt hash-аар хадгалагдах ба admin-д ч ил харагдахгүй.</p>
      </Section>

      <Section title="7. Холбоо барих">
        <p>Нууцлалтай холбоотой асуудлаар
          <a href="mailto:privacy@mnb.mn" className="text-accent hover:underline ml-1">privacy@mnb.mn</a>
          {" "}хаягаар холбогдоно уу.
        </p>
      </Section>
    </article>
  );
}

function PrivacyEn() {
  return (
    <article className="space-y-6 text-sm text-sub leading-relaxed">
      <Section title="1. Data Collected">
        <ul className="list-disc list-inside space-y-1.5 ml-1">
          <li>Account: phone, email, name, avatar</li>
          <li>Device: device ID, IP, browser</li>
          <li>Viewing history</li>
          <li>Payment history</li>
        </ul>
      </Section>
      <Section title="2. Use of Data">
        <p>To provide and improve the Service.</p>
      </Section>
      <Section title="3. Third Parties">
        <p>QPay (payments), Google (OAuth), authorities (legal).</p>
      </Section>
      <Section title="4. Cookies">
        <p>Used for session, theme, language preferences only.</p>
      </Section>
      <Section title="5. Your Rights">
        <p>View, update, delete your data.</p>
      </Section>
      <Section title="6. Security">
        <p>HTTPS encryption + bcrypt password hashing.</p>
      </Section>
      <Section title="7. Contact">
        <p>
          <a href="mailto:privacy@mnb.mn" className="text-accent hover:underline">privacy@mnb.mn</a>
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
