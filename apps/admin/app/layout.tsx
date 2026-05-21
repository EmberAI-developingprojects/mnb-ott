import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "МҮОНРТ Admin",
  description: "MNB OTT удирдлагын самбар",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body className="bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
