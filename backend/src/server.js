import express from "express";
import cors from "cors";
import http from "node:http";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocket } from "./socket.js";
import authRoutes from "./routes/auth.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import parentRoutes from "./routes/parent.routes.js";

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }
  return next(error);
});

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "familyguard-backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/parent", parentRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  return res.status(500).json({ message: "Unexpected server error" });
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.warn(`Received ${signal}. Closing FamilyGuard backend...`);
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Force shutting down after timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const start = async () => {
  await connectDb(env.MONGO_URI);
  initSocket(server);

  server.listen(Number(env.PORT), "0.0.0.0", () => {
    console.log(`FamilyGuard backend running on port ${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Server start failed", error);
  process.exit(1);
});
