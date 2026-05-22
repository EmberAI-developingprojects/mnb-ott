"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

/* Root /admin entry — нэвтэрсэн хэрэглэгчийн role-аар тохирох эхний хуудас руу шилжүүлнэ.
   - USER эсвэл нэвтрээгүй → /login
   - ADMIN, SUPER_ADMIN → /dashboard
   - EDITOR → /vod (контент удирдлага)
   - OPERATOR → /channels (live stream удирдлага) */
export default function Index() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    /* Persist rehydrate-ийг нэг tick хүлээж дараа routing хийнэ */
    const t = setTimeout(() => {
      if (!user || user.role === "USER") {
        router.replace("/login");
        return;
      }
      switch (user.role) {
        case "ADMIN":
        case "SUPER_ADMIN":
          router.replace("/dashboard");
          break;
        case "EDITOR":
          router.replace("/vod");
          break;
        case "OPERATOR":
          router.replace("/channels");
          break;
      }
    }, 0);
    return () => clearTimeout(t);
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted">
      Уншиж байна...
    </div>
  );
}
