import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET);
        if (payload.type === "parent" && payload.parentId) {
          socket.join(`parent:${payload.parentId}`);
        }
      } catch {
        socket.emit("socket:error", { message: "Invalid socket token" });
      }
    }

    socket.on("parent:join", (parentId) => {
      if (parentId) {
        socket.join(`parent:${parentId}`);
      }
    });

    socket.on("disconnect", () => {});
  });
};

export const emitToParent = (parentId, eventName, payload) => {
  if (!io || !parentId) return;
  io.to(`parent:${parentId}`).emit(eventName, payload);
};
