import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import ChildDevice from "../models/ChildDevice.js";
import { env } from "../config/env.js";

export const deviceAuth = async (req, res, next) => {
  try {
    const token = (req.header("x-device-token") || "").trim();
    if (!token) {
      return res.status(401).json({ message: "Missing x-device-token header" });
    }
    if (token.length < 20) {
      return res.status(401).json({ message: "Invalid device token format" });
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.type !== "device" || !payload.deviceId || !mongoose.isValidObjectId(payload.deviceId)) {
      return res.status(401).json({ message: "Invalid device token" });
    }

    const device = await ChildDevice.findById(payload.deviceId);
    if (!device) {
      return res.status(401).json({ message: "Unknown device" });
    }
    if (!device.deviceToken || device.deviceToken !== token) {
      return res.status(401).json({ message: "Device token mismatch" });
    }

    device.lastSeenAt = new Date();
    device.status = "online";
    ChildDevice.updateOne({ _id: device._id }, { $set: { lastSeenAt: device.lastSeenAt, status: "online" } }).catch(() => {});

    req.device = device;
    req.deviceClaims = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired device token" });
  }
};
