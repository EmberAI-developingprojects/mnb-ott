export type Role = "USER" | "ADMIN" | "EDITOR" | "OPERATOR" | "SUPER_ADMIN";
export type PlanType = "BASIC" | "TV" | "VOD" | "COMBO";
export type VodType = "FREE" | "PREMIUM";
export type SourceType = "YOUTUBE" | "S3";
export type ContentType = "LIVE" | "VOD";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";
export type NotificationType = "SYSTEM" | "SUBSCRIPTION" | "PAYMENT" | "CONTENT" | "PROMO";

/* v2 plan загвар: TV/Radio + архив бүх нэвтэрсэн хэрэглэгчид үнэгүй —
   зөвхөн premium VOD сан plan-аас хамаарна. */
export interface PlanCapability {
  premiumVod: boolean;
}

export interface PlanDefinition {
  type: PlanType;
  label: string;
  tagline: string;
  priceMonthly: number;
  priceWeekly: number;
  deviceLimit: number;
  features: string[];
  capabilities: PlanCapability;
}

export interface VodBundle {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  items: BundleItem[];
}

export interface BundleItem {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
  price: number;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  avatar?: string;
  role: Role;
  isVerified: boolean;
  hasPassword: boolean;
  createdAt: string;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  startedAt: string;
  expiresAt?: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
}

export type ChannelKind = "LIVE" | "TV" | "RADIO";

export interface Channel {
  id: string;
  name: string;
  slug: string;
  kind: ChannelKind;
  streamUrl?: string | null;
  epgUrl?: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
  orderIndex: number;
}

export interface EpgProgram {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  channel: string;
}

export interface VodContent {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  genre?: string;
  type: VodType;
  price?: number;
  duration?: number;
  publishedAt?: string;
  sources: VodSource[];
}

export interface VodSource {
  id: string;
  sourceType: SourceType;
  url: string;
  youtubeId?: string;
  quality?: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
}
