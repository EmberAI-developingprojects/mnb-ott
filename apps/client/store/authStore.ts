import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { setAccessToken } from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

/**
 * Хэрэглэгчийн нэвтрэлтийг localStorage-д хадгална.
 * Refresh хийгээд буцаж ачаалахад accessToken-г axios-д буцаан setAccessToken хийнэ
 * (onRehydrateStorage). Тиймээс хэрэглэгч нэвтэрсэн төлөвт үлдэнэ.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => {
        setAccessToken(token);
        set({ user, accessToken: token });
      },
      clearAuth: () => {
        setAccessToken(null);
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: "mnb-auth",
      /* user + accessToken хоёуланг хадгална — refresh-д session дуусахгүй */
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
      },
    },
  ),
);
