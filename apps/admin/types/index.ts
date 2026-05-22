/* Admin app-д ашиглах backend response shape-ууд */

export type Role = "USER" | "EDITOR" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
export type PlanType = "BASIC" | "TV" | "VOD" | "COMBO";
export type SubStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface AdminUser {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  role: Role;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User extends AdminUser {
  subscription?: {
    id: string;
    planType: PlanType;
    status: SubStatus;
    startedAt: string;
    expiresAt: string | null;
  } | null;
}

export interface UserDetail extends User {
  sessions: Array<{ id: string; deviceName: string; deviceType: string; lastActive: string; }>;
  purchases: Array<{ id: string; vodId: string; amount: number; expiresAt: string | null; status: string; createdAt: string; vod: { title: string } }>;
  payments:  Array<{ id: string; invoiceId: string; amount: number; status: PaymentStatus; paidAt: string | null; createdAt: string; }>;
}

export type VodType = "FREE" | "PREMIUM";

export interface VodContent {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  genre: string | null;
  type: VodType;
  price: number | null;
  duration: number | null;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  sources?: Array<{ id: string; sourceType: string; url: string; youtubeId: string | null }>;
  _count?: { purchases: number };
}

export type ChannelKind = "LIVE" | "TV" | "RADIO";

export interface Channel {
  id: string;
  name: string;
  slug: string;
  kind: ChannelKind;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface VodBundle {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  _count?: { items: number };
}

export interface BundleItem {
  id: string;
  bundleId: string;
  vodId: string;
  orderIndex: number;
  vod: { id: string; title: string; thumbnailUrl: string | null; duration: number | null };
}

export interface Payment {
  id: string;
  userId: string;
  invoiceId: string;
  qpayInvoiceId: string | null;
  amount: number;
  provider: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;   // enriched display name (user/vod/channel/bundle)
  action: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string | null; phone: string | null; role: Role };
}

export interface DashboardStats {
  users: { total: number; blocked: number; activeSubs: number };
  revenue: { total: number; today: number; todayCount: number };
  content: { vod: number; channels: number; bundles: number };
  plans: Array<{ plan: PlanType; count: number }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}
