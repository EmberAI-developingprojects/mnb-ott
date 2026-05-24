import { Manrope } from "next/font/google";

/* ════════════════════════════════════════════════════════════════
   ХЭРЭГЛЭГЧИЙН APP-ИЙН FONT — НЭГДСЭН ТОХИРГОО

   Font солих бол:
   1. Дээрх `Inter` import-ийг сольж (жишээ нь `Manrope`, `IBM_Plex_Sans`)
   2. `font = Inter({...})` хэсгийн `Inter`-ийг шинэ нэрээр сольж
   3. Admin app-ын `apps/admin/lib/font.ts` файлд адил өөрчилнө

   ⚠️ Cyrillic SUPPORT ЗААВАЛ:
   Mongolian (Кирилл) текст байгаа учир `subsets: ["latin", "cyrillic"]`-ийг
   дэмждэг font л сонгох ёстой. Доорх font-уудад Cyrillic дэмжсэн:
     ✓ Inter, Manrope, IBM_Plex_Sans, Noto_Sans, Roboto, Source_Sans_3, Nunito
     ✗ Geist (зөвхөн latin), Poppins (зөвхөн latin/devanagari), Lexend
   Дэмждэггүй font сонговол Mongolian текст fallback system font-руу унана.

   CSS-д хэрэглэх variable нэр `--font-app` нь font өөрчлөгдөхөд тогтмол —
   тиймээс layout.tsx, globals.css, tailwind.config.ts засах хэрэггүй.
   ════════════════════════════════════════════════════════════════ */

export const font = Manrope({
  subsets: ["latin", "cyrillic"], /* Mongolian Cyrillic дэмжих заавал */
  variable: "--font-app",
  display:  "swap",
});
