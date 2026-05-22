/* Admin service-уудын нэгдсэн barrel. Route файлууд эндээс single import-аар
   `import * as admin from "../services/admin"` хэлбэрээр ашиглана. */

export { audit, listAuditLogs, exportAuditXlsx } from "./audit.service";
export type { EnrichedAuditLog } from "./audit.service";

export { getDashboardStats } from "./stats.service";

export {
  listUsers, getUserDetail, changeUserRole, setUserBlocked,
} from "./users.service";

export {
  listVod, createVod, updateVod, deleteVod,
} from "./vod.service";

export {
  listChannels, createChannel, updateChannel, deleteChannel,
} from "./channels.service";

export {
  listBundles, createBundle, updateBundle, deleteBundle,
  getBundleItems, addBundleItem, removeBundleItem,
} from "./bundles.service";

export {
  listPayments, refundPayment,
} from "./payments.service";

export {
  broadcastNotification,
} from "./notifications.service";
