import type { Lang } from "@/store/settingsStore";

/* Backend AppError-ийн code → хэлэлсэн орчуулга.
   Backend нь { success: false, message, code } буцаадаг бөгөөд `message` нь
   default Mongolian-аар бичигдсэн. Энд `code`-аар хэрэглэгчийн хэлэнд орчуулна.
   Code dict-д байхгүй бол backend message-ийг fallback болгоно.

   Шинэ error code нэмэхэд: backend AppError-д код тогтоох, энд орчуулах. */
export const ERROR_MESSAGES: Record<string, Record<Lang, string>> = {
  // ─── Auth ───
  UNAUTHORIZED:           { mn: "Нэвтрэх шаардлагатай",                 en: "Authentication required" },
  INVALID_TOKEN:          { mn: "Token хүчингүй",                       en: "Invalid token" },
  INVALID_CREDENTIALS:    { mn: "Нэвтрэх мэдээлэл буруу байна",         en: "Invalid email/phone or password" },
  INVALID_REFRESH_TOKEN:  { mn: "Refresh token хүчингүй",               en: "Invalid refresh token" },
  NO_REFRESH_TOKEN:       { mn: "Refresh token байхгүй",                en: "No refresh token" },
  REFRESH_FAILED:         { mn: "Дахин нэвтэрнэ үү",                    en: "Please sign in again" },
  SESSION_NOT_FOUND:      { mn: "Session олдсонгүй",                    en: "Session not found" },
  INVALID_OTP:            { mn: "Код буруу эсвэл хугацаа дууссан",      en: "Invalid or expired code" },
  INVALID_GOOGLE_TOKEN:   { mn: "Google token хүчингүй",                en: "Invalid Google token" },
  INVALID_IDENTIFIER:     { mn: "Утас эсвэл email оруулна уу",          en: "Phone or email is required" },
  NO_PASSWORD:            { mn: "Энэ хаяг нууц үггүй бүртгэлтэй. Бүртгүүлэх хуудасруу ороод нууц үг тохируулна уу.",
                            en: "This account has no password yet. Go to register page to set one." },
  INVALID_PASSWORD:       { mn: "Одоогийн нууц үг буруу байна",         en: "Current password is incorrect" },
  EMAIL_NOT_VERIFIED:     { mn: "Бүртгэлээ баталгаажуулж дуусгана уу. Бүртгүүлэх хуудаснаас дахин код авна уу.",
                            en: "Please verify your account first. Resend the code from the register page." },
  EMAIL_AUTH_FAILED:      { mn: "Email server-ийн нэвтрэлт амжилтгүй",  en: "Email server authentication failed" },
  EMAIL_SEND_FAILED:      { mn: "Email илгээгдсэнгүй, дахин оролдоно уу", en: "Failed to send email, please try again" },
  ALREADY_EXISTS:         { mn: "Энэ хаяг бүртгэлтэй байна. Нэвтрэх хуудсаас нэвтэрнэ үү.",
                            en: "This account already exists. Please sign in instead." },
  BLOCKED:                { mn: "Таны бүртгэл түр хаагдсан байна. Дэмжлэгтэй холбогдоно уу.",
                            en: "Your account has been suspended. Please contact support." },

  // ─── Permission ───
  FORBIDDEN:              { mn: "Эрх хүрэлцэхгүй",                       en: "Access denied" },
  INSUFFICIENT_RANK:      { mn: "Зөвхөн өөрөөсөө бага эрх мэдэлтэй хэрэглэгчид үйлдэл хийх боломжтой",
                            en: "You can only perform actions on users with a lower role" },
  SELF_BAN:               { mn: "Өөрийгөө ban хийж болохгүй",            en: "You cannot ban yourself" },
  SELF_DELETE:            { mn: "Өөрийгөө устгаж болохгүй",              en: "You cannot delete yourself" },
  SELF_ROLE_CHANGE:       { mn: "Өөрийнхөө role-ийг өөрчилж болохгүй",   en: "You cannot change your own role" },
  LAST_SUPER_ADMIN:       { mn: "Сүүлчийн SUPER_ADMIN-ийг demote хийж болохгүй",
                            en: "Cannot demote the last SUPER_ADMIN" },

  // ─── Subscription / Content access ───
  SUBSCRIPTION_REQUIRED:  { mn: "VOD захиалга шаардлагатай",             en: "VOD subscription required" },
  PURCHASE_REQUIRED:      { mn: "Худалдан авах шаардлагатай",            en: "Purchase required" },
  PLAN_REQUIRED:          { mn: "Нэвтэрсэн ч уу шалгана уу",             en: "Please sign in" },
  INVALID_PLAN:           { mn: "Plan буруу — зөвхөн VOD захиалга боломжтой",
                            en: "Invalid plan — only VOD subscription is available" },
  ALREADY_RENTED:         { mn: "Аль хэдийн түрээслэсэн",                en: "Already rented" },
  ALREADY_PURCHASED:      { mn: "Аль хэдийн худалдаж авсан",             en: "Already purchased" },

  // ─── Payment ───
  NOT_LIVE_CHANNEL:       { mn: "Зөвхөн LIVE event-ийг худалдаж авна",   en: "Only LIVE events can be purchased" },
  LIVE_NO_PRICE:          { mn: "Live event үнэгүй байна",               en: "Live event has no price" },
  LIVE_INACTIVE:          { mn: "Live идэвхгүй байна",                   en: "Live event is inactive" },
  LIVE_NOT_FOUND:         { mn: "Live олдсонгүй",                        en: "Live event not found" },
  VOD_NOT_FOUND:          { mn: "Видео олдсонгүй",                       en: "Video not found" },
  NO_SOURCE:              { mn: "Stream URL олдсонгүй",                  en: "Stream URL not available" },
  INVALID_STATUS:         { mn: "Зөвхөн төлсөн төлбөрийг буцаах боломжтой",
                            en: "Only paid payments can be refunded" },

  // ─── Validation / generic ───
  NOT_FOUND:              { mn: "Олдсонгүй",                             en: "Not found" },
  BAD_REQUEST:            { mn: "Хүсэлт буруу",                          en: "Bad request" },
  RATE_LIMITED:           { mn: "Хэт олон хүсэлт ирлээ. Хэдэн минутын дараа дахин оролдоно уу.",
                            en: "Too many requests. Please try again later." },
  INTERNAL_SERVER_ERROR:  { mn: "Серверийн алдаа гарлаа",                en: "Server error" },
  NOT_IMPLEMENTED:        { mn: "Энэ функц хараахан бэлэн биш байна",    en: "This feature is not available yet" },
  UNKNOWN_ERROR:          { mn: "Алдаа гарлаа",                          en: "An error occurred" },
};

export function translateError(code: string | undefined, lang: Lang, fallback: string): string {
  if (!code) return fallback;
  const entry = ERROR_MESSAGES[code];
  return entry?.[lang] ?? fallback;
}
