import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { font } from "@/lib/font";

export const metadata: Metadata = {
  title:       "MNB",
  description: "Монголын Үндэсний Олон Нийтийн Радио Телевизийн онлайн платформ",
  applicationName: "МНБ OTT",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0b0c10" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4ef" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/* FOUC сэргийлэх — React hydrate-ээс ӨМНӨ <html>-д theme/lang class тавина.
   Бус анх ороход OS-ийн prefers-color-scheme + browser navigator.language-аас
   autodetect хийнэ. Хэрэглэгч UI-аас тодорхой сонгосон бол localStorage-аас
   уншиж тэрхүү сонголтыг хүндлэнэ.

   Энэ нь хоёр зорилго:
     1. FOUC arилах (dark/light flash)
     2. Анх орох хэрэглэгчид зөв default өгөх (OS + browser хэлээр) */
const initScript = `
(function() {
  try {
    var stored = localStorage.getItem('mnb-settings');
    var theme = null;
    var lang  = null;
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state) {
        theme = parsed.state.theme || null;
        lang  = parsed.state.lang  || null;
      }
    }
    // Theme — fallback: OS preference (prefers-color-scheme)
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    }
    // Lang — fallback: browser hэл (navigator.language). "mn-MN" → "mn".
    if (!lang) {
      var nav = navigator.language || 'mn';
      lang = nav.toLowerCase().indexOf('mn') === 0 ? 'mn' : 'en';
    }
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.lang = lang;
    // Window-д хадгалж store hydrate болохоос өмнө дамжуулна.
    window.__MNB_INIT__ = { theme: theme, lang: lang, hasStored: !!stored };
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.lang = 'mn';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={font.variable} suppressHydrationWarning>
      <head>
        {/* color-scheme + initial theme/lang — render-ээс ӨМНӨ ажилладаг. */}
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
