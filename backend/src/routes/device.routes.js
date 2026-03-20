import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import ChildDevice from "../models/ChildDevice.js";

const router = express.Router();

const enrollmentSchema = z.object({
  parentId: z.string(),
  childName: z.string(),
  deviceLabel: z.string(),
  platformVersion: z.string(),
  transparencyNoticeVersion: z.string(),
  consentAcceptedAt: z.string(),
  pairingCode: z.string(),
});

router.post("/enroll", async (req, res) => {
  try {
    const body = enrollmentSchema.parse(req.body);

    if (body.pairingCode !== env.PAIRING_CODE) {
      return res.status(403).json({ message: "Invalid pairing code" });
    }

    const device = await ChildDevice.create({
      parentId: body.parentId,
      childName: body.childName,
      deviceLabel: body.deviceLabel,
      platformVersion: body.platformVersion,
      transparencyNoticeVersion: body.transparencyNoticeVersion,
      consentAcceptedAt: body.consentAcceptedAt,
    });

    const deviceToken = jwt.sign(
      { deviceId: device._id.toString() },
      env.JWT_SECRET
    );

    return res.json({
      deviceId: device._id.toString(),
      deviceToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Enroll failed" });
  }
});


// 🔥 THIS IS IMPORTANT (DEVICE LIST)
router.get("/childdevices", async (req, res) => {
  try {
    const devices = await ChildDevice.find().sort({ createdAt: -1 });

    return res.json(
      devices.map((d) => ({
        _id: d._id,
        childName: d.childName,
        deviceLabel: d.deviceLabel,
        status: "online",
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch devices" });
  }
});

export default router;