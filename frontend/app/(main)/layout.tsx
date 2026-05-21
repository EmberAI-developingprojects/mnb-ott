import { Header } from "@/components/layout/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      <Header />
      <main className="pt-[72px]">{children}</main>
    </div>
  );
}
