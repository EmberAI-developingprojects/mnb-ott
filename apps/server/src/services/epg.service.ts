/* EPG Service — Хөтөлбөрийн жагсаалт.
   Provider abstraction:
     EPG_PROVIDER=mock (default) — энд бичсэн procedural mock өгөгдөл
     EPG_PROVIDER=xml             — fetchRealEpg() → МНБ XML/JSON feed
   Provider switch нь нэг л газар (доорх provider-ийн объект). Бодит EPG
   ирэхэд зөвхөн fetchRealEpg()-ийн implementation бичих хэрэгтэй. */

export interface EpgProgram {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  category?: string;
  isLive?: boolean;
}

export interface EpgChannel {
  id: string;
  name: string;
  slug: string;
  programs: EpgProgram[];
}

/* EpgProvider interface — XML feed, JSON API, эсвэл бусад source-аас
   ижил shape-тай өгөгдөл буцаах ёстой. Хэдэн хоног back/forward буцаахыг
   нэгдсэн форматаар хүлээж авна. */
export interface EpgProvider {
  getAll: (daysBack: number, daysForward: number) => Promise<EpgChannel[]> | EpgChannel[];
  getOne: (slug: string, daysBack: number, daysForward: number) => Promise<EpgChannel | null> | EpgChannel | null;
}

const CHANNELS = [
  { id: "ch1", name: "МНБ 1",        slug: "mnb1",          isRadio: false },
  { id: "ch2", name: "МНБ News",      slug: "mnb-news",      isRadio: false },
  { id: "ch3", name: "МНБ Sport",     slug: "mnb-sport",     isRadio: false },
  { id: "ch4", name: "МНБ Family",    slug: "mnb-family",    isRadio: false },
  { id: "ch5", name: "МНБ World",     slug: "mnb-world",     isRadio: false },
  { id: "ch6", name: "МНБ Радио",     slug: "mnb-radio",     isRadio: true  },
  { id: "ch7", name: "Bluesky Radio", slug: "bluesky-radio", isRadio: true  },
];

// Суваг бүрийн өдрийн типовой хуваарь (минутаар)
const DAILY_SCHEDULE: { title: string; duration: number; category: string }[][] = [
  // МНБ 1
  [
    { title: "Өглөөний мэдээ", duration: 30, category: "Мэдээ" },
    { title: "Цагийн хүрд", duration: 60, category: "Мэдээ" },
    { title: "Өглөөний хөтөлбөр", duration: 90, category: "Нэвтрүүлэг" },
    { title: "Монголын мэдээ", duration: 30, category: "Мэдээ" },
    { title: "Үдийн цаг", duration: 60, category: "Нэвтрүүлэг" },
    { title: "Үдийн мэдээ", duration: 30, category: "Мэдээ" },
    { title: "Жив жив", duration: 60, category: "Хүүхэд" },
    { title: "Парламентийн долоо хоног", duration: 60, category: "Нэвтрүүлэг" },
    { title: "Орой үзэх цаг", duration: 90, category: "Нэвтрүүлэг" },
    { title: "Оройн мэдээ", duration: 30, category: "Мэдээ" },
    { title: "Шөнийн хөтөлбөр", duration: 120, category: "Нэвтрүүлэг" },
    { title: "Шөнийн мэдээ", duration: 30, category: "Мэдээ" },
    { title: "Шөнийн кино", duration: 120, category: "Кино" },
  ],
  // МНБ 2
  [
    { title: "МНБ 2 — Өглөөний хөтөлбөр", duration: 120, category: "Нэвтрүүлэг" },
    { title: "Сурган хүмүүжүүлэх нэвтрүүлэг", duration: 60, category: "Нэвтрүүлэг" },
    { title: "Эрүүл мэнд", duration: 60, category: "Нэвтрүүлэг" },
    { title: "Үдийн кино", duration: 90, category: "Кино" },
    { title: "Хөдөлмөрийн баатар", duration: 60, category: "Баримтат" },
    { title: "Танин мэдэхүйн нэвтрүүлэг", duration: 60, category: "Нэвтрүүлэг" },
    { title: "Спортын мэдээ", duration: 30, category: "Спорт" },
    { title: "Оройн кино", duration: 120, category: "Кино" },
    { title: "МНБ 2 — Оройн хөтөлбөр", duration: 90, category: "Нэвтрүүлэг" },
    { title: "Шөнийн нэвтрүүлэг", duration: 150, category: "Нэвтрүүлэг" },
  ],
  // МНБ World
  [
    { title: "MNB World Morning", duration: 120, category: "Мэдээ" },
    { title: "Mongolia Today", duration: 60, category: "Мэдээ" },
    { title: "Cultural Mongolia", duration: 60, category: "Баримтат" },
    { title: "Business Mongolia", duration: 60, category: "Нэвтрүүлэг" },
    { title: "MNB World News", duration: 30, category: "Мэдээ" },
    { title: "Discover Mongolia", duration: 60, category: "Баримтат" },
    { title: "Sports Mongolia", duration: 60, category: "Спорт" },
    { title: "MNB World Evening", duration: 90, category: "Мэдээ" },
    { title: "Mongolia Tonight", duration: 120, category: "Нэвтрүүлэг" },
  ],
  // МНБ 4
  [
    { title: "МНБ 4 — Өглөөний хөтөлбөр", duration: 180, category: "Нэвтрүүлэг" },
    { title: "Хүүхдийн цаг", duration: 120, category: "Хүүхэд" },
    { title: "Аялал жуулчлал", duration: 60, category: "Баримтат" },
    { title: "Жив жив — Дахин", duration: 60, category: "Хүүхэд" },
    { title: "Монголын байгаль", duration: 60, category: "Баримтат" },
    { title: "Тоглоомын хөтөлбөр", duration: 90, category: "Нэвтрүүлэг" },
    { title: "МНБ 4 — Оройн хөтөлбөр", duration: 120, category: "Нэвтрүүлэг" },
    { title: "Шөнийн нэвтрүүлэг", duration: 90, category: "Нэвтрүүлэг" },
  ],
  // МНБ 5
  [
    { title: "Спортын шинэ мэдээ", duration: 60, category: "Спорт" },
    { title: "Тэмцээн шууд", duration: 120, category: "Спорт" },
    { title: "Бокс тэмцээн", duration: 90, category: "Спорт" },
    { title: "Спортын тойм", duration: 60, category: "Спорт" },
    { title: "Хөл бөмбөг", duration: 120, category: "Спорт" },
    { title: "Спортын мэдээ", duration: 30, category: "Спорт" },
    { title: "Сагсан бөмбөг", duration: 120, category: "Спорт" },
    { title: "Оройн спорт", duration: 60, category: "Спорт" },
    { title: "Тэмцээний тойм", duration: 90, category: "Спорт" },
    { title: "Шөнийн спорт", duration: 90, category: "Спорт" },
  ],
  // МНБ Радио
  [
    { title: "Өглөөний мэнд", duration: 120, category: "Радио" },
    { title: "Өдрийн цэнхэр цаг", duration: 180, category: "Радио" },
    { title: "Хөгжмийн цаг", duration: 120, category: "Радио" },
    { title: "Мэдээ", duration: 30, category: "Радио" },
    { title: "Монгол аялгуу", duration: 120, category: "Радио" },
    { title: "Оройн мэдээ", duration: 30, category: "Радио" },
    { title: "Шөнийн хөгжим", duration: 180, category: "Радио" },
  ],
  // Bluesky Radio
  [
    { title: "Morning Vibes", duration: 180, category: "Радио" },
    { title: "Top Hits", duration: 120, category: "Радио" },
    { title: "Lunch Beats", duration: 120, category: "Радио" },
    { title: "Afternoon Mix", duration: 180, category: "Радио" },
    { title: "Evening Chill", duration: 120, category: "Радио" },
    { title: "Night Lounge", duration: 180, category: "Радио" },
  ],
];

function buildPrograms(
  scheduleIndex: number,
  dayOffset: number // 0 = өнөөдөр, -3..+5
): EpgProgram[] {
  const schedule = DAILY_SCHEDULE[scheduleIndex] ?? DAILY_SCHEDULE[0];
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() + dayOffset);
  base.setHours(6, 0, 0, 0); // 06:00-аас эхэлнэ

  const programs: EpgProgram[] = [];
  let cursor = base.getTime();

  for (let i = 0; i < schedule.length; i++) {
    const s = schedule[i];
    const start = new Date(cursor);
    const end = new Date(cursor + s.duration * 60 * 1000);
    programs.push({
      id: `${scheduleIndex}-${dayOffset}-${i}`,
      title: s.title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      category: s.category,
    });
    cursor = end.getTime();
  }

  return programs;
}

/* ─── Mock provider — procedural өгөгдөл ─────────────────────── */
const mockProvider: EpgProvider = {
  getAll(daysBack, daysForward) {
    return CHANNELS.map((ch, idx) => {
      const programs: EpgProgram[] = [];
      for (let d = -daysBack; d <= daysForward; d++) {
        programs.push(...buildPrograms(idx, d));
      }
      return { ...ch, programs };
    });
  },
  getOne(slug, daysBack, daysForward) {
    const idx = CHANNELS.findIndex((c) => c.slug === slug);
    if (idx === -1) return null;
    const programs: EpgProgram[] = [];
    for (let d = -daysBack; d <= daysForward; d++) {
      programs.push(...buildPrograms(idx, d));
    }
    return { id: CHANNELS[idx].id, name: CHANNELS[idx].name, slug, programs };
  },
};

/* ─── XML provider stub — МНБ-ээс бодит feed ирэхэд бичих ────────
   ENV: EPG_FEED_URL — XMLTV/JSON endpoint
   Implementation:
     1. axios.get(EPG_FEED_URL)
     2. xml2js эсвэл JSON.parse
     3. Channel-уудыг slug-аар map хийж EpgChannel[] буцаах
     4. Redis cache 1 цаг (request бүрд татахгүйн тулд)
   Одоохондоо throw — mock-руу буцаахаар үндсэн router default-аар.        */
const xmlProvider: EpgProvider = {
  getAll: () => { throw new Error("EPG XML provider бэлэн биш — fetchRealEpg() implement хийнэ"); },
  getOne: () => { throw new Error("EPG XML provider бэлэн биш — fetchRealEpg() implement хийнэ"); },
};

/* ENV-ээс provider сонгоно. Default mock. */
function getProvider(): EpgProvider {
  return process.env.EPG_PROVIDER === "xml" ? xmlProvider : mockProvider;
}

/* Public API — route-аас энэ 2 функц л дуудна. Provider солих нь ENV-ээр. */
export function getEpg(daysBack = 3, daysForward = 5): EpgChannel[] | Promise<EpgChannel[]> {
  return getProvider().getAll(daysBack, daysForward);
}

export function getChannelEpg(slug: string, daysBack = 3, daysForward = 5): EpgChannel | null | Promise<EpgChannel | null> {
  return getProvider().getOne(slug, daysBack, daysForward);
}

