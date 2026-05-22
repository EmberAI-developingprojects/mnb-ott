import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang  = "mn" | "en";
export type Theme = "dark" | "light";

interface SettingsStore {
  lang:  Lang;
  theme: Theme;
  setLang:     (l: Lang)  => void;
  setTheme:    (t: Theme) => void;
  toggleTheme: ()         => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      lang:  "mn",
      theme: "dark",
      setLang:     (lang)  => set({ lang }),
      setTheme:    (theme) => set({ theme }),
      toggleTheme: ()      => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "mnb-settings" }
  )
);

/* ─────────────────────────────────────────────────────
   Бүх орчуулга нэг газар
───────────────────────────────────────────────────── */
const dict: Record<string, [string, string]> = {
  // [Монгол, English]

  // Navigation
  home:         ["Нүүр",               "Home"],
  tv:           ["TV",                 "TV"],
  live:         ["Шууд",               "Live"],
  search_ph:    ["Хайх...",            "Search..."],

  // Auth
  login:        ["Нэвтрэх",            "Sign In"],
  register:     ["Бүртгүүлэх",         "Sign Up"],
  logout:       ["Гарах",              "Sign Out"],
  google_login: ["Google-ээр нэвтрэх", "Continue with Google"],
  otp_send:     ["Нэвтрэх кодыг авах", "Get verification code"],
  otp_verify:   ["Баталгаажуулах",     "Verify"],
  otp_resend:   ["Дахин код авах",     "Resend code"],
  otp_title:    ["Кодоо оруулна уу",   "Enter verification code"],
  otp_sent_to:  ["дугаарт код илгээлээ","a code was sent"],
  forgot_pw:    ["Нууц үг мартсан?",   "Forgot password?"],
  reset_pw:     ["Нууц үг сэргээх",    "Reset Password"],
  reset_done:   ["Амжилттай шинэчлэгдлээ","Password updated"],
  new_user:     ["Шинэ хэрэглэгч үү?", "New here?"],
  has_account:  ["Бүртгэлтэй юу?",     "Already have an account?"],

  // Profile
  profile:           ["Профайл",                 "Profile"],
  account_info:      ["Хэрэглэгчийн мэдээлэл",   "Account Info"],
  security:          ["Нууц үг & Аюулгүй байдал", "Password & Security"],
  subscription:      ["Захиалга & Багц",          "Subscription"],
  devices:           ["Төхөөрөмжүүд",             "Devices"],
  purchases:         ["Худалдан авалт",            "Purchases"],
  delete_account:    ["Бүртгэл устгах",            "Delete account"],
  settings:          ["Тохиргоо",                 "Preferences"],
  notifications:     ["Мэдэгдэл",                 "Notifications"],
  notif_empty:       ["Мэдэгдэл байхгүй",         "No notifications"],
  notif_mark_all:    ["Бүгдийг уншсан болгох",    "Mark all as read"],
  notif_new:         ["Шинэ",                     "New"],
  prefs_title:       ["Тохиргоо",                 "Preferences"],
  prefs_language:    ["Хэл",                      "Language"],
  prefs_theme:       ["Дэлгэцийн горим",          "Theme"],
  prefs_theme_dark:  ["Бараан",                   "Dark"],
  prefs_theme_light: ["Цайвар",                   "Light"],
  prefs_autoplay:    ["Дараагийн анги автомат",   "Autoplay next episode"],
  prefs_notify_email:["И-мэйл мэдэгдэл",         "Email notifications"],
  prefs_notify_promo:["Урамшуулал, шинэ контент", "Promotions & new content"],
  name:              ["Нэр",                      "Name"],
  email:             ["И-мэйл",                   "Email"],
  phone:             ["Утасны дугаар",             "Phone number"],
  account_id:        ["Бүртгэлийн хаяг",          "Account address"],
  current_pw:        ["Одоогийн нууц үг",          "Current password"],
  new_pw:            ["Шинэ нууц үг (8+)",         "New password (8+)"],
  confirm_pw:        ["Нууц үг давтах",            "Confirm password"],
  change_pw:         ["Нууц үг солих",             "Change Password"],
  pw_no_set:         ["Google-ээр бүртгүүлсэн тул нууц үг тохируулаагүй", "No password set (Google account)"],
  sign_out_confirm:  ["Та гарахдаа итгэлтэй байна уу?", "Are you sure you want to sign out?"],

  // Devices
  device_title:  ["Нэвтэрсэн төхөөрөмжүүд", "Active devices"],
  device_sub:    ["Нэвтэрсэн бүх төхөөрөмжийн жагсаалт", "All signed-in devices"],
  device_signout:["Гарах",                  "Sign out"],
  no_devices:    ["Төхөөрөмж олдсонгүй",    "No devices found"],

  // Subscription
  sub_title:     ["Захиалга & Багц",        "Subscription & Plans"],
  sub_current:   ["Одоогийн",               "Current"],
  sub_monthly:   ["Сарын",                  "Monthly"],
  sub_weekly:    ["7 хоногийн",             "Weekly"],
  sub_active:    ["Идэвхтэй",               "Active"],
  sub_expired:   ["Дууссан",                "Expired"],
  sub_until:     ["хүртэл",                 "until"],
  sub_current_plan:["Одоогийн план",        "Current plan"],
  sub_subscribe: ["Захиалах",               "Subscribe"],
  sub_change:    ["Багц өөрчлөх",           "Change plan"],
  sub_upgrade:   ["Шинэ захиалга хийх",     "New subscription"],
  sub_free:      ["Идэвхтэй",               "Active"],
  sub_device_limit:["device нэгэн зэрэг",  "devices at once"],
  sub_per_month: ["сар",                    "mo"],
  sub_per_week:  ["7 хоног",               "wk"],
  sub_tab_plans: ["Гишүүнчлэлийн багц",     "Membership plans"],
  sub_tab_bundles:["Видео багц",             "Video bundles"],
  sub_bundles_hint:["Тусдаа худалдан авч үзэх багцууд", "One-time bundles you can purchase"],
  sub_includes_n:["видео",                  "videos"],
  sub_buy_now:   ["Худалдаж авах",          "Buy now"],
  sub_purchased: ["Худалдан авсан",          "Purchased"],

  // QPay
  qpay_title:    ["QPay төлбөр",            "QPay Payment"],
  qpay_scan:     ["QPay апп-аар уншуулж",   "Scan with QPay app to pay"],
  qpay_waiting:  ["Төлбөр хүлээж байна...", "Waiting for payment..."],

  // Watchlist
  watchlist:     ["Үзэх жагсаалт",                "Watchlist"],
  watchlist_empty:["Хадгалсан бичлэг байхгүй", "No saved videos"],
  watchlist_hint:["Бичлэгийн дэлгэрэнгүй дээрх \"Хадгалах\" товчийг ашигла", "Use \"Save\" on a video to add it here"],

  // Common
  save:          ["Хадгалах",              "Save"],
  cancel:        ["Цуцлах",               "Cancel"],
  back:          ["Буцах",                "Back"],
  details:       ["Дэлгэрэнгүй",          "More info"],
  watch:         ["Үзэх",                 "Watch"],
  see_all:       ["Бүгдийг харах",        "See all"],
  loading:       ["Ачааллаж байна...",     "Loading..."],
  saving:        ["Хадгалж байна...",      "Saving..."],
  saved_ok:      ["✓ Хадгалагдлаа",       "✓ Saved"],
  changed_ok:    ["✓ Өөрчлөгдлөө",       "✓ Changed"],
  no_results:    ["Илэрц олдсонгүй",      "No results"],
  error_generic: ["Алдаа гарлаа",         "Something went wrong"],

  // Live
  live_offline:  ["Шууд нэвтрүүлэг одоо байхгүй", "No live broadcast right now"],
  live_next:     ["-д эхэлнэ",            "starts at"],
  live_schedule: ["Өнөөдрийн хөтөлбөр",   "Today's schedule"],
  channels:      ["Сувгууд",              "Channels"],
  schedule:      ["Хөтөлбөр",            "Schedule"],

  // Search
  search_title:   ["хайлтын үр дүн",           "search results"],
  search_found:   ["үр дүн олдлоо",            "results found"],
  search_btn:     ["Хайх",                     "Search"],
  search_page_ph: ["Нэвтрүүлэг хайх...",       "Search programs..."],
  search_none:    ["илэрц олдсонгүй",          "no results found for"],
  see_archive:    ["Архив харах",              "Browse archive"],
  browse:         ["Үзэх",                     "Browse"],
  library:        ["Видео сан",                "Library"],
  bundles:        ["Видео багц",               "Bundles"],
  archive:        ["Архив",                    "Archive"],

  // Auth field labels & messages
  phone_or_email: ["Утас эсвэл имэйл",         "Phone or email"],
  password:       ["Нууц үг",                  "Password"],
  forgot_link:    ["Мартсан?",                 "Forgot?"],
  divider_or:     ["эсвэл",                    "or"],
  login_loading:  ["Нэвтэрч байна...",          "Signing in..."],
  validating:     ["Хянаж байна...",            "Validating..."],
  sending:        ["Илгээж байна...",           "Sending..."],
  continue_btn:   ["Үргэлжлүүлэх",            "Continue"],
  otp_get:        ["Нэг удаагийн код авах",     "Get one-time code"],
  pw_update:      ["Нууц үг шинэчлэх",         "Update Password"],
  pw_new_label:   ["Шинэ нууц үг",             "New Password"],
  pw_min_8:       ["Хамгийн багадаа 8 тэмдэгт байна", "Must be at least 8 characters"],
  pw_mismatch:    ["Нууц үг таарахгүй байна",  "Passwords do not match"],
  name_required:  ["Нэр оруулна уу",           "Name is required"],
  id_required:    ["Утас эсвэл имэйл оруулна уу", "Phone or email required"],
  agree_terms:    ["Бүртгүүлснээр үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө",
                   "By signing up, you agree to our Terms & Privacy Policy"],
  terms:          ["Үйлчилгээний нөхцөл",      "Terms of Service"],
  privacy:        ["Нууцлалын бодлого",        "Privacy Policy"],
  and_word:       ["болон",                    "and"],
  verify_title:   ["Баталгаажуулах",           "Verify"],
  otp_sent_desc:  ["-д 6 оронтой код илгээлээ", "6-digit code sent to"],
  otp_resend_in:  ["с дараа дахин авах",       "s · resend code"],
  pw_reset_title: ["Нууц үг сэргээх",          "Reset Password"],
  pw_reset_desc:  ["Бүртгэлтэй утас эсвэл имэйлд код явуулна", "We'll send a code to your phone or email"],
  pw_updated_ok:  ["Амжилттай шинэчлэгдлээ",  "Password updated"],
  pw_updated_sub: ["Шинэ нууц үгээрээ нэвтэрч болно", "You can now sign in with your new password"],

  // Subscription
  sub_featured:   ["Онцлох",                   "Featured"],
  sub_free_label: ["Үнэгүй",                   "Free"],
  sub_waiting:    ["Хүлээнэ үү...",             "Please wait..."],
  sub_devices_at: ["device нэгэн зэрэг",        "devices at once"],

  // Home
  live_section:   ["Шууд нэвтрүүлэг",          "Live Channels"],
  see_more:       ["Бүгдийг харах",            "See all"],
};

export function useT() {
  const lang = useSettingsStore((s) => s.lang);
  return (key: string, fallback?: string): string => {
    const pair = dict[key];
    if (!pair) return fallback ?? key;
    return lang === "mn" ? pair[0] : pair[1];
  };
}

// Server component-д ашиглах (hook биш)
export function getT(lang: Lang) {
  return (key: string, fallback?: string): string => {
    const pair = dict[key];
    if (!pair) return fallback ?? key;
    return lang === "mn" ? pair[0] : pair[1];
  };
}
