import type { Metadata } from "next";
import "./globals.css";
import { font } from "@/lib/font";

export const metadata: Metadata = {
  title: "МҮОНРТ OTT — Admin",
  description: "MNB OTT удирдлагын самбар",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={font.variable}>
      <body className="bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
