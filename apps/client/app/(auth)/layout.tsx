import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>

      {/* Left — visual */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden" style={{ backgroundColor: "#0A1628" }}>
        <img src="/login.webp" alt="login"
          className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
          style={{ filter: "brightness(0.9) saturate(1.1)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,70,165,0.45) 0%, rgba(0,0,0,0.2) 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0f172a]/70" />

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden">
            <Image src="/mnb.png" alt="МНБ" fill sizes="36px" className="object-contain" />
          </div>
          <div>
            <p className="text-white/50 text-[10px] tracking-[0.25em] uppercase font-semibold">МҮОНРТ</p>
            <p className="text-white text-base font-bold tracking-wide leading-none">OTT</p>
          </div>
        </div>

        {/* Features */}
        <div className="absolute bottom-10 left-8 right-8 space-y-3">
          {[
            { path: "M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18v12z", text: "7 суваг шууд нэвтрүүлэг" },
            { path: "M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z", text: "17,000+ нэвтрүүлгийн архив" },
            { path: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z", text: "DVR — 7 хоног ухрааж үзэх" },
          ].map(({ path, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d={path}/></svg>
              </div>
              <span className="text-white/75 text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="relative w-7 h-7 rounded-lg overflow-hidden">
            <Image src="/mnb.png" alt="МНБ" fill sizes="28px" className="object-contain" />
          </div>
          <span className="text-app text-sm font-bold tracking-wide">МҮОНРТ OTT</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[380px]">
            {children}
          </div>
        </div>

        <p className="text-center text-xs text-muted pb-6">
          © {new Date().getFullYear()} МҮОНРТ. Бүх эрх хамгаалагдсан.
        </p>
      </div>
    </div>
  );
}
