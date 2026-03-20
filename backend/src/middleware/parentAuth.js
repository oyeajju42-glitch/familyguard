import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const parentAuth = (req, res, next) => {
  try {
    const authHeader = (req.header("authorization") || "").trim();
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = bearerMatch?.[1]?.trim();
    if (!token) {
      return res.status(401).json({ message: "Authorization token is required" });
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.type !== "parent") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    req.parent = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
