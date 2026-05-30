import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiError } from "@/types";
import { translateError } from "./errorMessages";
import { useSettingsStore } from "@/store/settingsStore";

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
  /* Auth төлөв өөрчлөгдсөн — auth-аас хамаарсан cache (channels streamUrl) хүчингүй */
  clearGetCache();
}

/** authStore-аас subscribe хийж token өөрчлөлтийг хадгална */
export function onAccessTokenChange(fn: TokenListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify(token: string | null) {
  /* refresh-ийн token rotation / logout зам — cache мөн цэвэрлэнэ */
  clearGetCache();
  listeners.forEach((fn) => fn(token));
}

/* ─── GET cache (in-memory, per-tab) ────────────────────────────────
   /api/channels, /api/channels/epg зэрэг hot endpoint-ийг хуудас хооронд
   шилжихэд дахин дахин татахаас сэргийлнэ. TTL дотор давхар дуудлагыг нэг
   in-flight promise болгож coalesce хийнэ (request dedup).
   ЧУХАЛ: channels-ийн streamUrl нь auth/purchase-аас хамаардаг тул login/
   logout (token өөрчлөгдөх) бүрт cache-ийг бүхэлд нь цэвэрлэнэ — stale
   streamUrl (paywall bypass / "Үзэх→login→буцах" flow) үүсэхгүй. */
type CacheEntry = { expires: number; promise: Promise<{ data: unknown }> };
const getCache = new Map<string, CacheEntry>();

export function clearGetCache(): void {
  getCache.clear();
}

export async function cachedGet<T>(
  url: string,
  config?: AxiosRequestConfig & { ttl?: number },
): Promise<{ data: T }> {
  const ttl = config?.ttl ?? 30_000;
  const key = url + (config?.params ? JSON.stringify(config.params) : "");
  const now = Date.now();

  const hit = getCache.get(key);
  if (hit && hit.expires > now) return hit.promise as Promise<{ data: T }>;

  const promise = api.get<T>(url, config).then((res) => ({ data: res.data }));
  getCache.set(key, { expires: now + ttl, promise });
  /* Алдаа гарвал evict — дараагийн дуудлага дахин оролдоно (stale-error cache-гүй) */
  promise.catch(() => { getCache.delete(key); });
  return promise as Promise<{ data: T }>;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** Refresh-ийг нэг удаа дуудаж бусад concurrent request-уудад дахин ашиглах.
 * Promise-ийг await хийсэн ч буцах хүртэл refreshPromise null болохгүй —
 * бүх concurrent retry-ууд нэг л үр дүн авна. Promise resolve болсны дараа
 * (амжилттай эсвэл fail) null болгож шинэ refresh-ийг боломжтой болгоно. */
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
    }
  })();
  /* Promise settle-ийн дараа л null болгоно — concurrent retry-ууд бүгд адил
     үр дүнг хүлээж авна. Өмнө setTimeout(0) нь macrotask, promise чейн
     дотор fast-path race нь stale token retry үүсгэдэг байсан. */
  refreshPromise.finally(() => { refreshPromise = null; });
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

/* Backend error-ийг хэрэглэгчийн хэлэнд орчуулж буцаана. Server `code` field
   ашиглаж `errorMessages.ts`-аас орчуулга хайна. Code dict-д байхгүй бол server-
   ийн default message (Mongolian)-ийг fallback болгоно.
   Network error / unknown error үед зөв localized "An error occurred" буцаана. */
export function getApiError(error: unknown): ApiError {
  const lang = useSettingsStore.getState().lang;

  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<ApiError>;
    const fallback = data.message ?? translateError("UNKNOWN_ERROR", lang, "");
    return {
      success: false,
      code:    data.code    ?? "UNKNOWN_ERROR",
      message: translateError(data.code, lang, fallback),
    };
  }

  /* Network error эсвэл backend response байхгүй (timeout, ECONNREFUSED) */
  return {
    success: false,
    code:    "UNKNOWN_ERROR",
    message: translateError("UNKNOWN_ERROR", lang, "Алдаа гарлаа"),
  };
}

export default api;
