import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { setAccessToken, onAccessTokenChange } from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

/**
 * Хэрэглэгчийн нэвтрэлтийг localStorage-д хадгална.
 * Refresh хийгээд буцаж ачаалахад:
 *   1. user + accessToken хоёулангаар нь localStorage-аас сэргээгдэнэ
 *   2. setAccessToken-аар axios client дотор token шилжинэ
 *   3. api.ts дотроос refresh ажилласан үед onAccessTokenChange-аар
 *      шинэ token-ийг store-д буцаан хадгална
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
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
      },
    },
  ),
);

/* Token refresh listener — api.ts-аас ирэх event-ийг store-д sync хийнэ.
   - Refresh амжилттай: шинэ token-ийг store-д бичнэ
   - Refresh бүтэлгүй: user, accessToken хоёуланг цэвэрлэнэ.
     Хэрэв одоо нийтийн хуудаст байгаа бол redirect хийхгүй — тухайн хуудас
     өөрөө нэвтрэлт шаардахдаа /login руу зөөнө. */
if (typeof window !== "undefined") {
  onAccessTokenChange((token) => {
    if (token) {
      useAuthStore.setState({ accessToken: token });
    } else {
      const { user } = useAuthStore.getState();
      if (user) {
        useAuthStore.setState({ user: null, accessToken: null });
      }
    }
  });
}
