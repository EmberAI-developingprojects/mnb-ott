import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      {/* A11y: Skip-to-content link — Tab дарахад л харагдана. WCAG 2.4.1. */}
      <a href="#main-content" className="skip-link">
        Үндсэн агуулга руу шилжих
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
