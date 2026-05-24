import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { font } from "@/lib/font";

export const metadata: Metadata = {
  title:       "МҮОНРТ OTT",
  description: "Монголын Үндэсний Олон Нийтийн Радио Телевизийн онлайн платформ",
  applicationName: "МНБ OTT",
  icons: { icon: "/mnb.png" },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={font.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
