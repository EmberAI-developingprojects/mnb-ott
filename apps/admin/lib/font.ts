import { Roboto } from "next/font/google";

/* ════════════════════════════════════════════════════════════════
   АДМИН APP-ИЙН FONT — НЭГДСЭН ТОХИРГОО

   `font` (Roboto) = бүх хуудасны үндсэн sans (--font-app).

   Font солих бол:
   1. `Roboto` import + `Roboto({...})`-ийг шинэ фонтоор солино
   2. CSS variable нэр `--font-app` тогтмол — layout.tsx/globals.css засахгүй

   ⚠️ Cyrillic SUPPORT ЗААВАЛ (Mongolian Кирилл):
     ✓ Roboto, Manrope, Inter, IBM_Plex_Sans, Noto_Sans → latin + cyrillic

   Roboto static хувилбар — боломжтой жингүүд: 100/300/400/500/700/900.
   600 (font-semibold) байхгүй тул хамгийн ойрын 700-аар буух тул
   тэдгээрийг ачаалж UI-ийн medium/bold-ийг бүрэн хангана. */

export const font = Roboto({
  weight:   ["300", "400", "500", "700", "900"],
  subsets:  ["latin", "cyrillic"],
  variable: "--font-app",
  display:  "swap",
});
