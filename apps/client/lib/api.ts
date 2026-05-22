import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

type TokenListener = (token: string | null) => void;
const listeners = new Set<TokenListener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** authStore-аас subscribe хийж token өөрчлөлтийг хадгална */
export function onAccessTokenChange(fn: TokenListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify(token: string | null) {
  listeners.forEach((fn) => fn(token));
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** Refresh-ийг нэг удаа дуудаж бусад concurrent request-уудад дахин ашиглах */
async function refresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const token = data?.data?.accessToken as string | undefined;
      if (token) {
        accessToken = token;
        notify(token);
        return token;
      }
      return null;
    } catch {
      return null;
    } finally {
      /* Дараагийн event tick-д concurrent retry-нуудад нэг хариу үлдээдэг */
      setTimeout(() => { refreshPromise = null; }, 0);
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (NonNullable<AxiosError["config"]> & { _retry?: boolean })
      | undefined;

    /* Token-гүй endpoint-ууд (login, refresh, register, forgot/reset) дээр
       401 ирэх нь "credential буруу" гэсэн утгатай — refresh оролдох ёсгүй.
       Эс бөгөөс нэг login оролдлогод 2 запрос явдаг. */
    const isAuthEndpoint = original?.url
      ? /\/api\/auth\/(login|refresh|register|forgot-password|reset-password|send-otp|verify-otp|google)/.test(original.url)
      : false;

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const newToken = await refresh();
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
        return api(original);
      }

      /* Refresh бүтэлгүйтэв — token цэвэрлэнэ. Хуудас руу хүчээр redirect ХИЙХГҮЙ.
         authStore-ийн listener-ээр user state цэвэрлэгдээд, тухайн хуудас өөрөө шийднэ
         (жишээ нь /profile хуудас → /login руу redirect; нийтийн /home хуудас → орхино) */
      accessToken = null;
      notify(null);
    }
    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }
  return { success: false, message: "Алдаа гарлаа", code: "UNKNOWN_ERROR" };
}

export default api;
