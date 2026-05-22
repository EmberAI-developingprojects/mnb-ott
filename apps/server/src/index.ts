import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.routes";
import { channelRouter } from "./routes/channel.routes";
import { vodRouter } from "./routes/vod.routes";
import { paymentRouter } from "./routes/payment.routes";
import { subscriptionRouter } from "./routes/subscription.routes";
import { searchRouter } from "./routes/search.routes";
import { adminRouter } from "./routes/admin.routes";
import { notificationRouter } from "./routes/notification.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRouter);
app.use("/api/channels", channelRouter);
app.use("/api/vod", vodRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/search", searchRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
