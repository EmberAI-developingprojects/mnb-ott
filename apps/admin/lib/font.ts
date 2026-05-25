import { Manrope } from "next/font/google";

/* ════════════════════════════════════════════════════════════════
   АДМИН APP-ИЙН FONT — НЭГДСЭН ТОХИРГОО

   Font солих бол:
   1. Дээрх `Manrope` import-ийг сольж (жишээ нь `Inter`, `IBM_Plex_Sans`)
   2. `font = Manrope({...})` хэсгийн `Manrope`-ийг шинэ нэрээр сольж
   3. Client app-ын `apps/client/lib/font.ts` файлд адил өөрчилнө

   ⚠️ Cyrillic SUPPORT ЗААВАЛ:
   Mongolian (Кирилл) текст байгаа учир `subsets: ["latin", "cyrillic"]`-ийг
   дэмждэг font л сонгох ёстой. Cyrillic дэмждэг font-ууд:
     ✓ Inter, Manrope, IBM_Plex_Sans, Noto_Sans, Roboto, Source_Sans_3
     ✗ Geist, Poppins, Lexend (зөвхөн latin)
   Дэмждэггүй font сонговол админ текст fallback system font-руу унана.

   CSS-д хэрэглэх variable нэр `--font-app` нь font өөрчлөгдөхөд тогтмол —
   тиймээс layout.tsx, globals.css, tailwind.config.ts засах хэрэггүй.
   ════════════════════════════════════════════════════════════════ */

export const font = Manrope({
  subsets: ["latin", "cyrillic"], /* Mongolian Cyrillic дэмжих заавал */
  variable: "--font-app",
  display:  "swap",
});
