import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUser } from "@/types";
import { setAccessToken, onAccessTokenChange } from "@/lib/api";

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  setAuth: (user: AdminUser, token: string) => void;
  clearAuth: () => void;
}

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
      name: "mnb-admin-auth",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    },
  ),
);

/* api.ts-аас token refresh болоход store-руу sync */
if (typeof window !== "undefined") {
  onAccessTokenChange((token) => {
    if (token) {
      useAuthStore.setState({ accessToken: token });
    } else {
      const { user } = useAuthStore.getState();
      if (user) useAuthStore.setState({ user: null, accessToken: null });
    }
  });
}
