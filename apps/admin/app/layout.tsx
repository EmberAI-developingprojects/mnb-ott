import type { Metadata } from "next";
import "./globals.css";
import { font } from "@/lib/font";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "МҮОНРТ OTT — Admin",
  description: "MNB OTT удирдлагын самбар",
  icons: { icon: "/logo.png" },
};

/* Hydration-аас ӨМНӨ theme-ийг тогтоох blocking script — light flash-аас сэргийлнэ.
   :root = light, default = dark тул эхний paint-д data-theme="dark"-ийг шууд тавина.
   ThemeProvider-тэй ижил конвенц (dark=set, light=remove). */
const THEME_INIT = `(function(){try{var t="dark",r=localStorage.getItem("mnb-admin-settings");if(r){var p=JSON.parse(r);if(p&&p.state&&(p.state.theme==="light"||p.state.theme==="dark"))t=p.state.theme;}if(t==="dark")document.documentElement.setAttribute("data-theme","dark");else document.documentElement.removeAttribute("data-theme");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="bg-bg text-fg antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
