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

/* ВНИМАНИЕ: initial state нь SSR + client first paint аль алинд ижил байх ёстой
   (React hydration mismatch error 425/422-аас сэргийлэх). Тиймээс window дотроос
   уншихгүй — тогтсон default. localStorage-аас Zustand persist аль хэдийн hydrate
   хийдэг. First-time visitor-ийн OS detect нь дараах useDetectInitialPrefs hook
   дотор useEffect-ээр явагдана (mismatch үүсгэхгүй). */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      lang:  "mn" as Lang,
      theme: "dark" as Theme,
      setLang:     (lang)  => set({ lang }),
      setTheme:    (theme) => set({ theme }),
      toggleTheme: ()      => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "mnb-settings" }
  )
);

/* ─────────────────────────────────────────────────────
   Бүх орчуулга нэг газар
   Format: Record<key, Record<Lang, string>> — scale-friendly
   Шинэ хэл нэмэхэд: Lang type-д "kr" нэмж, entry бүрд kr: "..."
───────────────────────────────────────────────────── */
const dict: Record<string, Record<Lang, string>> = {
  // ─── Navigation ────────────────────────────────────
  home:         { mn: "Нүүр",               en: "Home" },
  tv:           { mn: "TV",                 en: "TV" },
  live:         { mn: "Шууд",               en: "Live" },
  menu:         { mn: "Цэс",                en: "Menu" },
  search_ph:    { mn: "Хайх...",            en: "Search..." },

  // ─── Auth ──────────────────────────────────────────
  login:        { mn: "Нэвтрэх",            en: "Sign In" },
  register:     { mn: "Бүртгүүлэх",         en: "Sign Up" },
  logout:       { mn: "Гарах",              en: "Sign Out" },
  google_login: { mn: "Google-ээр нэвтрэх", en: "Continue with Google" },
  otp_send:     { mn: "Нэвтрэх кодыг авах", en: "Get verification code" },
  otp_verify:   { mn: "Баталгаажуулах",     en: "Verify" },
  otp_resend:   { mn: "Дахин код авах",     en: "Resend code" },
  otp_title:    { mn: "Кодоо оруулна уу",   en: "Enter verification code" },
  otp_sent_to:  { mn: "дугаарт код илгээлээ", en: "a code was sent" },
  forgot_pw:    { mn: "Нууц үг мартсан?",   en: "Forgot password?" },
  reset_pw:     { mn: "Нууц үг сэргээх",    en: "Reset Password" },
  reset_done:   { mn: "Амжилттай шинэчлэгдлээ", en: "Password updated" },
  new_user:     { mn: "Шинэ хэрэглэгч үү?", en: "New here?" },
  has_account:  { mn: "Бүртгэлтэй юу?",     en: "Already have an account?" },

  // ─── Profile ───────────────────────────────────────
  profile:           { mn: "Профайл",                 en: "Profile" },
  account_info:      { mn: "Хэрэглэгчийн мэдээлэл",   en: "Account Info" },
  security:          { mn: "Нууц үг & Аюулгүй байдал", en: "Password & Security" },
  subscription:      { mn: "Захиалга & Багц",          en: "Subscription" },
  devices:           { mn: "Төхөөрөмжүүд",             en: "Devices" },
  purchases:         { mn: "Худалдан авалт",            en: "Purchases" },
  delete_account:    { mn: "Бүртгэл устгах",            en: "Delete account" },
  settings:          { mn: "Тохиргоо",                 en: "Preferences" },
  notifications:     { mn: "Мэдэгдэл",                 en: "Notifications" },
  notif_empty:       { mn: "Мэдэгдэл байхгүй",         en: "No notifications" },
  notif_mark_all:    { mn: "Бүгдийг уншсан болгох",    en: "Mark all as read" },
  notif_new:         { mn: "Шинэ",                     en: "New" },
  prefs_title:       { mn: "Тохиргоо",                 en: "Preferences" },
  prefs_language:    { mn: "Хэл",                      en: "Language" },
  prefs_theme:       { mn: "Дэлгэцийн горим",          en: "Theme" },
  prefs_theme_dark:  { mn: "Бараан",                   en: "Dark" },
  prefs_theme_light: { mn: "Цайвар",                   en: "Light" },
  prefs_autoplay:    { mn: "Дараагийн анги автомат",   en: "Autoplay next episode" },
  prefs_notify_email:{ mn: "И-мэйл мэдэгдэл",          en: "Email notifications" },
  prefs_notify_promo:{ mn: "Урамшуулал, шинэ контент", en: "Promotions & new content" },
  name:              { mn: "Нэр",                      en: "Name" },
  email:             { mn: "И-мэйл",                   en: "Email" },
  phone:             { mn: "Утасны дугаар",             en: "Phone number" },
  account_id:        { mn: "Бүртгэлийн хаяг",          en: "Account address" },
  current_pw:        { mn: "Одоогийн нууц үг",          en: "Current password" },
  new_pw:            { mn: "Шинэ нууц үг (8+)",         en: "New password (8+)" },
  confirm_pw:        { mn: "Нууц үг давтах",            en: "Confirm password" },
  change_pw:         { mn: "Нууц үг солих",             en: "Change Password" },
  pw_no_set:         { mn: "Google-ээр бүртгүүлсэн тул нууц үг тохируулаагүй", en: "No password set (Google account)" },
  sign_out_confirm:  { mn: "Та гарахдаа итгэлтэй байна уу?", en: "Are you sure you want to sign out?" },

  // Profile sections / nav labels
  account_section:   { mn: "Бүртгэл",                  en: "Account" },
  support_section:   { mn: "Тусламж",                  en: "Support" },
  help_faq:          { mn: "Түгээмэл асуулт",          en: "Help & FAQ" },
  terms_short:       { mn: "Үйлчилгээний нөхцөл",      en: "Terms of Service" },
  privacy_short:     { mn: "Нууцлалын бодлого",        en: "Privacy Policy" },

  // ─── Devices ───────────────────────────────────────
  device_title:  { mn: "Нэвтэрсэн төхөөрөмжүүд",       en: "Active devices" },
  device_sub:    { mn: "Нэвтэрсэн бүх төхөөрөмжийн жагсаалт", en: "All signed-in devices" },
  device_signout:{ mn: "Гарах",                        en: "Sign out" },
  no_devices:    { mn: "Төхөөрөмж олдсонгүй",          en: "No devices found" },
  devices_table_device:   { mn: "Төхөөрөмж",           en: "Device" },
  devices_table_app:      { mn: "Апп",                 en: "App" },
  devices_table_connected:{ mn: "Холбогдсон",          en: "Connected" },
  devices_table_last:     { mn: "Сүүлд",               en: "Last active" },
  devices_table_actions:  { mn: "Үйлдэл",              en: "Actions" },
  this_device:            { mn: "Энэ төхөөрөмж",       en: "This device" },

  // ─── Subscription ──────────────────────────────────
  sub_title:       { mn: "Захиалга & Багц",            en: "Subscription & Plans" },
  sub_current:     { mn: "Одоогийн",                   en: "Current" },
  sub_monthly:     { mn: "Сарын",                      en: "Monthly" },
  sub_weekly:      { mn: "7 хоногийн",                 en: "Weekly" },
  sub_active:      { mn: "Идэвхтэй",                   en: "Active" },
  sub_expired:     { mn: "Дууссан",                    en: "Expired" },
  sub_until:       { mn: "хүртэл",                     en: "until" },
  sub_current_plan:{ mn: "Одоогийн план",              en: "Current plan" },
  sub_subscribe:   { mn: "Захиалах",                   en: "Subscribe" },
  sub_change:      { mn: "Багц өөрчлөх",               en: "Change plan" },
  sub_upgrade:     { mn: "Шинэ захиалга хийх",         en: "New subscription" },
  sub_free:        { mn: "Идэвхтэй",                   en: "Active" },
  sub_device_limit:{ mn: "device нэгэн зэрэг",         en: "devices at once" },
  sub_per_month:   { mn: "сар",                        en: "mo" },
  sub_per_week:    { mn: "7 хоног",                    en: "wk" },
  sub_tab_plans:   { mn: "Гишүүнчлэлийн багц",         en: "Membership plans" },
  sub_tab_bundles: { mn: "Видео багц",                 en: "Video bundles" },
  sub_bundles_hint:{ mn: "Тусдаа худалдан авч үзэх багцууд", en: "One-time bundles you can purchase" },
  sub_includes_n:  { mn: "видео",                      en: "videos" },
  sub_buy_now:     { mn: "Худалдаж авах",              en: "Buy now" },
  sub_purchased:   { mn: "Худалдан авсан",             en: "Purchased" },
  sub_activated:   { mn: "Идэвхжлээ",                  en: "Activated" },
  sub_cancel_title:{ mn: "Захиалга цуцлах",            en: "Cancel subscription" },
  sub_cancel_body: { mn: "Цуцалсны дараа BASIC багц руу шилжих болно. Та үргэлжлүүлэх үү?",
                     en: "After canceling you will move to the BASIC plan. Continue?" },
  cancel_plan:     { mn: "Цуцлах",                     en: "Cancel plan" },
  keep_plan:       { mn: "Болих",                      en: "Keep" },
  activate:        { mn: "Идэвхжүүлэх",                en: "Activate" },
  sub_confirm_plan_mn: { mn: "багц",                   en: "plan" }, // unused but kept for parity
  sub_confirm_body:{ mn: "Та энэ багцыг идэвхжүүлэхдээ итгэлтэй байна уу?",
                     en: "Are you sure you want to activate this plan?" },
  caps_tv_radio_dvr:{ mn: "TV суваг + Радио + DVR",    en: "TV channels + Radio + DVR" },
  caps_yt_archive: { mn: "YouTube архив",              en: "YouTube archive" },
  caps_vod_lib:    { mn: "Премиум VOD сан",            en: "Premium VOD library" },
  live_events:     { mn: "LIVE event",                 en: "LIVE events" },
  live_events_desc:{ mn: "LIVE event-ийг тус бүрчлэн худалдан аваад үзнэ. 24 цаг хүртэл хүчинтэй.",
                     en: "Purchase LIVE events individually, watch for up to 24 hours." },

  // ─── QPay ──────────────────────────────────────────
  qpay_title:    { mn: "QPay төлбөр",                 en: "QPay Payment" },
  qpay_scan:     { mn: "QPay апп-аар уншуулж",        en: "Scan with QPay app to pay" },
  qpay_scan_short:{ mn: "QPay апп-аар уншуулж",       en: "Scan with QPay app —" },
  qpay_waiting:  { mn: "Төлбөр хүлээж байна...",      en: "Waiting for payment..." },

  // ─── Watchlist ─────────────────────────────────────
  watchlist:     { mn: "Үзэх жагсаалт",                en: "Watchlist" },
  watchlist_empty:{ mn: "Хадгалсан бичлэг байхгүй",    en: "No saved videos" },
  watchlist_hint:{ mn: "Бичлэгийн дэлгэрэнгүй дээрх \"Хадгалах\" товчийг ашигла",
                   en: "Use \"Save\" on a video to add it here" },
  watchlist_hint_long:{ mn: "Бичлэгийн дэлгэрэнгүй дээрх \"Хадгалах\" товчийг ашиглана уу",
                        en: "Use the \"Save\" button on a video page to add it here" },
  remove:        { mn: "Хасах",                        en: "Remove" },

  // ─── Common ────────────────────────────────────────
  save:          { mn: "Хадгалах",              en: "Save" },
  saved:         { mn: "Хадгалсан",             en: "Saved" },
  cancel:        { mn: "Цуцлах",                en: "Cancel" },
  cancel_short:  { mn: "Болих",                 en: "Cancel" },
  back:          { mn: "Буцах",                 en: "Back" },
  delete:        { mn: "Устгах",                en: "Delete" },
  close:         { mn: "Хаах",                  en: "Close" },
  share:         { mn: "Хуваалцах",             en: "Share" },
  details:       { mn: "Дэлгэрэнгүй",           en: "More info" },
  watch:         { mn: "Үзэх",                  en: "Watch" },
  see_all:       { mn: "Бүгдийг харах",         en: "See all" },
  see_all_short: { mn: "Бүгдийг",               en: "See all" },
  load_more:     { mn: "Цааш үзэх",             en: "Load more" },
  loading:       { mn: "Ачааллаж байна...",     en: "Loading..." },
  saving:        { mn: "Хадгалж байна...",      en: "Saving..." },
  creating:      { mn: "Үүсгэж байна...",       en: "Creating..." },
  deleting:      { mn: "Устгаж байна...",       en: "Deleting..." },
  saved_ok:      { mn: "✓ Хадгалагдлаа",        en: "✓ Saved" },
  changed_ok:    { mn: "✓ Өөрчлөгдлөө",         en: "✓ Changed" },
  no_results:    { mn: "Илэрц олдсонгүй",       en: "No results" },
  error_generic: { mn: "Алдаа гарлаа",          en: "Something went wrong" },

  // ─── Live ──────────────────────────────────────────
  live_offline:  { mn: "Шууд нэвтрүүлэг одоо байхгүй", en: "No live broadcast right now" },
  live_next:     { mn: "-д эхэлнэ",             en: "starts at" },
  live_schedule: { mn: "Өнөөдрийн хөтөлбөр",    en: "Today's schedule" },
  channels:      { mn: "Сувгууд",               en: "Channels" },
  schedule:      { mn: "Хөтөлбөр",              en: "Schedule" },
  live_ends_in:  { mn: "Дуусахад ",             en: "Ends in " },
  live_now:      { mn: "Одоо явагдаж байна",    en: "Live now" },

  // ─── Search ────────────────────────────────────────
  search_title:   { mn: "хайлтын үр дүн",         en: "search results" },
  search_found:   { mn: "үр дүн олдлоо",          en: "results found" },
  search_btn:     { mn: "Хайх",                   en: "Search" },
  search_page_ph: { mn: "Нэвтрүүлэг хайх...",     en: "Search programs..." },
  search_none:    { mn: "илэрц олдсонгүй",        en: "no results found for" },
  see_archive:    { mn: "Архив харах",            en: "Browse archive" },
  browse:         { mn: "Үзэх",                   en: "Browse" },
  library:        { mn: "Видео сан",              en: "Library" },
  bundles:        { mn: "Видео багц",             en: "Bundles" },
  archive:        { mn: "Архив",                  en: "Archive" },

  // ─── Auth field labels & messages ──────────────────
  phone_or_email: { mn: "Утас эсвэл имэйл",        en: "Phone or email" },
  password:       { mn: "Нууц үг",                 en: "Password" },
  forgot_link:    { mn: "Мартсан?",                en: "Forgot?" },
  divider_or:     { mn: "эсвэл",                   en: "or" },
  login_loading:  { mn: "Нэвтэрч байна...",         en: "Signing in..." },
  validating:     { mn: "Хянаж байна...",           en: "Validating..." },
  sending:        { mn: "Илгээж байна...",          en: "Sending..." },
  continue_btn:   { mn: "Үргэлжлүүлэх",            en: "Continue" },
  otp_get:        { mn: "Нэг удаагийн код авах",    en: "Get one-time code" },
  pw_update:      { mn: "Нууц үг шинэчлэх",        en: "Update Password" },
  pw_new_label:   { mn: "Шинэ нууц үг",            en: "New Password" },
  pw_min_8:       { mn: "Хамгийн багадаа 8 тэмдэгт байна", en: "Must be at least 8 characters" },
  pw_mismatch:    { mn: "Нууц үг таарахгүй байна",  en: "Passwords do not match" },
  name_required:  { mn: "Нэр оруулна уу",           en: "Name is required" },
  id_required:    { mn: "Утас эсвэл имэйл оруулна уу", en: "Phone or email required" },
  agree_terms:    { mn: "Бүртгүүлснээр үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрнө",
                    en: "By signing up, you agree to our Terms & Privacy Policy" },
  terms:          { mn: "Үйлчилгээний нөхцөл",      en: "Terms of Service" },
  privacy:        { mn: "Нууцлалын бодлого",        en: "Privacy Policy" },
  and_word:       { mn: "болон",                    en: "and" },
  verify_title:   { mn: "Баталгаажуулах",           en: "Verify" },
  otp_sent_desc:  { mn: "-д 6 оронтой код илгээлээ", en: "6-digit code sent to" },
  otp_resend_in:  { mn: "с дараа дахин авах",       en: "s · resend code" },
  pw_reset_title: { mn: "Нууц үг сэргээх",          en: "Reset Password" },
  pw_reset_desc:  { mn: "Бүртгэлтэй утас эсвэл имэйлд код явуулна",
                    en: "We'll send a code to your phone or email" },
  pw_updated_ok:  { mn: "Амжилттай шинэчлэгдлээ",   en: "Password updated" },
  pw_updated_sub: { mn: "Шинэ нууц үгээрээ нэвтэрч болно", en: "You can now sign in with your new password" },

  // ─── Subscription (legacy keys still used) ─────────
  sub_featured:   { mn: "Онцлох",                   en: "Featured" },
  sub_free_label: { mn: "Үнэгүй",                   en: "Free" },
  sub_waiting:    { mn: "Хүлээнэ үү...",            en: "Please wait..." },
  sub_devices_at: { mn: "device нэгэн зэрэг",       en: "devices at once" },

  // ─── Home ──────────────────────────────────────────
  live_section:   { mn: "Шууд нэвтрүүлэг",          en: "Live Channels" },
  see_more:       { mn: "Бүгдийг харах",            en: "See all" },

  // ─── Not Found (404) ───────────────────────────────
  not_found_title: { mn: "Хуудас олдсонгүй",        en: "Page not found" },
  go_home:         { mn: "Нүүр хуудас",             en: "Go home" },
  go_back:         { mn: "Буцах",                   en: "Go back" },

  // ─── Notifications page ────────────────────────────
  notif_delete_q:    { mn: "Мэдэгдэл устгах уу?",   en: "Delete notification?" },
  notif_delete_undo: { mn: "Энэ үйлдлийг буцаах боломжгүй.", en: "This action cannot be undone." },
  notif_empty_title: { mn: "Мэдэгдэл алга",         en: "No notifications" },
  notif_empty_sub:   { mn: "Шинэ мэдэгдэл орвол энд харагдана", en: "New notifications will appear here" },

  // ─── Help page ─────────────────────────────────────
  help_title:    { mn: "Түгээмэл асуулт",          en: "Help & FAQ" },
  help_subtitle: { mn: "МНБ OTT-н тухай хамгийн их асуудаг асуултууд",
                   en: "Most common questions about МНБ OTT" },

  // ─── Privacy page ──────────────────────────────────
  privacy_updated: { mn: "Сүүлд шинэчилсэн: 2026 оны 5 сарын 1",
                     en: "Last updated: May 1, 2026" },

  // ─── Terms page ────────────────────────────────────
  terms_updated:   { mn: "Сүүлд шинэчилсэн: 2026 оны 5 сарын 1",
                     en: "Last updated: May 1, 2026" },

  // ─── Privacy page ──────────────────────────────────
  privacy_title: { mn: "Нууцлалын бодлого",        en: "Privacy Policy" },

  // ─── Terms page ────────────────────────────────────
  terms_title:   { mn: "Үйлчилгээний нөхцөл",      en: "Terms of Service" },

  // ─── Purchases page ────────────────────────────────
  purchases_history:  { mn: "Худалдан авалтын түүх",        en: "Purchase history" },
  purchase_empty:     { mn: "Худалдан авалт байхгүй",       en: "No purchases yet" },
  purchase_empty_sub: { mn: "Эхний захиалга энд харагдана", en: "Your first purchase will appear here" },
  purchase_expires:   { mn: "Дуусах",                       en: "expires" },
  purchase_expired:   { mn: "Дууссан",                      en: "Expired" },
  purchase_active:    { mn: "Идэвхтэй",                     en: "Active" },

  // ─── Settings page ─────────────────────────────────
  playback_section:    { mn: "Үзлэгийн тохиргоо",       en: "Playback" },
  danger_zone:         { mn: "Аюултай хэсэг",           en: "Danger zone" },
  delete_account_btn:  { mn: "Бүртгэл устгах",          en: "Delete account" },
  danger_zone_desc:    { mn: "Бүртгэлээ устгасны дараа сэргээх боломжгүй. Захиалга, түүх, мэдэгдэл бүгд алга болно.",
                         en: "Once you delete your account, it cannot be recovered. All subscription, history, and notifications will be erased." },
  delete_confirm_pre:  { mn: "Баталгаажуулахын тулд доорх талбарт ",         en: "To confirm, type " },
  delete_confirm_post: { mn: " гэж бичнэ үү.",                                en: " in the field below." },

  // ─── TV page ───────────────────────────────────────
  tv_empty:              { mn: "TV суваг байхгүй",          en: "No TV channels" },
  tv_empty_sub:          { mn: "Админ суваг нэмэхэд энд харагдана.", en: "Channels added by admin will appear here." },
  all_channels:          { mn: "Бүх суваг",                  en: "All channels" },
  stream_unavailable:    { mn: "Дамжуулалт түр зогссон",    en: "Stream temporarily unavailable" },
  today_schedule:        { mn: "Өнөөдрийн хөтөлбөр",        en: "Today's schedule" },
  epg_7day:              { mn: "7 өдрийн EPG",              en: "7-day EPG" },
  today_schedule_empty:  { mn: "Өнөөдрийн хөтөлбөр алга",   en: "No schedule for today" },
  replay:                { mn: "Дахин үзэх",                en: "Replay" },
  watch_live:            { mn: "Шууд үзэх",                 en: "Watch live" },
  radio_label:           { mn: "Радио",                     en: "Radio" },

  // ─── VOD detail ────────────────────────────────────
  views:           { mn: "үзэлт",                  en: "views" },
  show_less:       { mn: "Хураах",                 en: "Show less" },
  show_more:       { mn: "Дэлгэрэнгүй харах",      en: "Show more" },
  related_videos:  { mn: "Холбоотой нэвтрүүлэг",   en: "Related videos" },

  // ─── Login prompt ──────────────────────────────────
  signin_continue:       { mn: "Үргэлжлүүлэхийн тулд нэвтэрнэ үү", en: "Sign in to continue" },
  signin_default_desc:   { mn: "Бүртгэлтэй хаягаараа нэвтэрснээр контентыг үргэлжлүүлэн үзнэ",
                           en: "Sign in with your account to keep watching" },
  signin_short:          { mn: "Нэвтрэх",                   en: "Sign in" },
  register_short:        { mn: "Бүртгүүлэх",                en: "Register" },

  // ─── Upgrade prompt ────────────────────────────────
  rent_video:        { mn: "Түрээслэх",                en: "Rent video" },
  purchase_to_watch: { mn: "Худалдан авч үзэх",        en: "Purchase to watch" },
  login_short:       { mn: "Нэвтрэх",                  en: "Log in" },
  subscribe_short:   { mn: "Багц авах",                en: "Subscribe" },

  // ─── Legal links (register/footer) ─────────────────
  legal_intro:       { mn: "Бүртгүүлснээр та",         en: "By registering, you agree to our" },
  legal_terms_lower: { mn: "үйлчилгээний нөхцөл",      en: "Terms of Service" },
  legal_and:         { mn: "ба",                       en: "and" },
  legal_privacy_lower:{ mn: "нууцлалын бодлогыг",      en: "Privacy Policy" },
  legal_outro:       { mn: "зөвшөөрнө.",               en: "" },
  legal_got_it:      { mn: "Ойлголоо",                 en: "Got it" },

  // ─── Common labels for sections ────────────────────
  go_to_home:        { mn: "Нүүр",                     en: "Home" },

  // ─── Player ───
  stream_load_failed: { mn: "Stream ачаалахад алдаа гарлаа", en: "Failed to load stream" },

  // ─── Error boundary ───
  error_title:    { mn: "Алдаа гарлаа",                                    en: "Something went wrong" },
  error_subtitle: { mn: "Үйлдэл амжилтгүй боллоо. Хэсэг хүлээгээд дахин оролдоно уу.",
                    en: "Action failed. Please wait a moment and try again." },
  error_id:       { mn: "Алдааны ID",                                      en: "Error ID" },
  try_again:      { mn: "Дахин оролдох",                                   en: "Try again" },

  // ─── Subscription confirm — {label} + {price} + period ──
  sub_confirm_title:  { mn: "{label} багц",            en: "{label} plan" },
  sub_confirm_body_monthly: {
    mn: "{price}₮ үнэтэй сарын захиалга идэвхжих гэж байна. Үргэлжлүүлэх үү?",
    en: "You are about to activate the monthly plan for ₮{price}. Continue?",
  },
  sub_confirm_body_weekly: {
    mn: "{price}₮ үнэтэй 7 хоногийн захиалга идэвхжих гэж байна. Үргэлжлүүлэх үү?",
    en: "You are about to activate the weekly plan for ₮{price}. Continue?",
  },
};

/* Variable interpolation — dict string дотор {placeholder} оронд утга тавина.
   Жишээ: t("welcome", { name: "Бат" }) → "Тавтай морил, Бат" */
function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function useT() {
  const lang = useSettingsStore((s) => s.lang);
  return (key: string, varsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
    const entry = dict[key];
    const vars  = typeof varsOrFallback === "object" ? varsOrFallback : undefined;
    const fb    = typeof varsOrFallback === "string" ? varsOrFallback : fallback;
    const raw   = entry?.[lang] ?? fb ?? key;
    return interpolate(raw, vars);
  };
}

// Server component-д ашиглах (hook биш)
export function getT(lang: Lang) {
  return (key: string, varsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
    const entry = dict[key];
    const vars  = typeof varsOrFallback === "object" ? varsOrFallback : undefined;
    const fb    = typeof varsOrFallback === "string" ? varsOrFallback : fallback;
    const raw   = entry?.[lang] ?? fb ?? key;
    return interpolate(raw, vars);
  };
}
