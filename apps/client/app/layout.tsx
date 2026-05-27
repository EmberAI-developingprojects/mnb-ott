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

/* FOUC сэргийлэх — React hydrate болохоос өмнө localStorage-ээс theme уншиж
   <html>-д `light`/`dark` class шууд тавина. Эс бөгөөс initial render-д default
   (dark) харагдаад React-аас зөв theme-руу шилждэг → flash. */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('mnb-settings');
    var theme = 'dark';
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state && parsed.state.theme) theme = parsed.state.theme;
    }
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={font.variable} suppressHydrationWarning>
      <head>
        {/* color-scheme — browser native UI (scrollbar, form input) theme-тэй
            sync байх. dangerouslySetInnerHTML л блок ийг render-ээс өмнө явуулна. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
