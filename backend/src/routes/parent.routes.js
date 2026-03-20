import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { parentAuth } from "../middleware/parentAuth.js";
import ChildDevice from "../models/ChildDevice.js";
import LocationLog from "../models/LocationLog.js";
import ScreenTimeLog from "../models/ScreenTimeLog.js";
import AppUsageLog from "../models/AppUsageLog.js";
import InstalledAppsSnapshot from "../models/InstalledAppsSnapshot.js";
import SmsSnapshot from "../models/SmsSnapshot.js";
import NotificationLog from "../models/NotificationLog.js";
import DeviceActivityLog from "../models/DeviceActivityLog.js";
import RemoteCommand from "../models/RemoteCommand.js";
import { emitToParent } from "../socket.js";

const router = express.Router();

router.use(parentAuth);

const commandSchema = z.object({
  commandType: z.enum(["ping", "lock-screen-intent", "request-location-now", "request-sync-now"]),
  payload: z.record(z.any()).optional(),
});

const safeLimit = (value, fallback = 30) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 200);
};

const verifyOwnership = async (deviceId, parentId) => {
  if (!mongoose.isValidObjectId(deviceId)) return null;
  return ChildDevice.findOne({ _id: deviceId, parentId });
};

const handleRouteError = (res, error, fallbackMessage) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Validation failed", errors: error.flatten() });
  }
  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
};

const mapDevice = (device) => ({
  id: device._id.toString(),
  parentId: device.parentId,
  childName: device.childName,
  deviceLabel: device.deviceLabel,
  platformVersion: device.platformVersion,
  transparencyNoticeVersion: device.transparencyNoticeVersion,
  consentAcceptedAt: device.consentAcceptedAt,
  status: device.status,
  lastSeenAt: device.lastSeenAt,
  createdAt: device.createdAt,
});

router.get("/devices", async (req, res) => {
  try {
    const devices = await ChildDevice.find({ parentId: req.parent.parentId }).sort({ createdAt: -1 });
    return res.json({ devices: devices.map(mapDevice) });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch devices");
  }
});

router.get("/devices/:deviceId/locations", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await LocationLog.find({ deviceId: device._id }).sort({ recordedAt: -1 }).limit(safeLimit(req.query.limit));
    return res.json({
      logs: logs.map((log) => ({
        id: log._id.toString(),
        latitude: log.latitude,
        longitude: log.longitude,
        accuracyMeters: log.accuracyMeters,
        batteryLevel: log.batteryLevel,
        recordedAt: log.recordedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch location logs");
  }
});

router.get("/devices/:deviceId/screen-time", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await ScreenTimeLog.find({ deviceId: device._id }).sort({ recordedAt: -1 }).limit(safeLimit(req.query.limit));
    return res.json({
      logs: logs.map((log) => ({
        id: log._id.toString(),
        date: log.date,
        totalMinutes: log.totalMinutes,
        appBreakdown: log.appBreakdown,
        recordedAt: log.recordedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch screen time logs");
  }
});

router.get("/devices/:deviceId/app-usage", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await AppUsageLog.find({ deviceId: device._id }).sort({ recordedAt: -1 }).limit(safeLimit(req.query.limit));
    return res.json({
      logs: logs.map((log) => ({
        id: log._id.toString(),
        packageName: log.packageName,
        appName: log.appName,
        minutes: log.minutes,
        date: log.date,
        recordedAt: log.recordedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch app usage logs");
  }
});

router.get("/devices/:deviceId/installed-apps", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await InstalledAppsSnapshot.find({ deviceId: device._id })
      .sort({ capturedAt: -1 })
      .limit(safeLimit(req.query.limit, 10));

    return res.json({
      snapshots: logs.map((item) => ({
        id: item._id.toString(),
        apps: item.apps,
        capturedAt: item.capturedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch installed apps snapshots");
  }
});

router.get("/devices/:deviceId/sms", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const snapshots = await SmsSnapshot.find({ deviceId: device._id }).sort({ capturedAt: -1 }).limit(safeLimit(req.query.limit, 10));
    return res.json({
      snapshots: snapshots.map((item) => ({
        id: item._id.toString(),
        messages: item.messages,
        capturedAt: item.capturedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch SMS snapshots");
  }
});

router.get("/devices/:deviceId/notifications", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await NotificationLog.find({ deviceId: device._id }).sort({ postedAt: -1 }).limit(safeLimit(req.query.limit));
    return res.json({
      logs: logs.map((log) => ({
        id: log._id.toString(),
        packageName: log.packageName,
        appName: log.appName,
        title: log.title,
        text: log.text,
        postedAt: log.postedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch notifications");
  }
});

router.get("/devices/:deviceId/activity", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const logs = await DeviceActivityLog.find({ deviceId: device._id }).sort({ occurredAt: -1 }).limit(safeLimit(req.query.limit));
    return res.json({
      logs: logs.map((log) => ({
        id: log._id.toString(),
        eventType: log.eventType,
        title: log.title,
        description: log.description,
        metadata: log.metadata,
        occurredAt: log.occurredAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch activity logs");
  }
});

router.get("/devices/:deviceId/commands", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const commands = await RemoteCommand.find({ deviceId: device._id })
      .sort({ requestedAt: -1 })
      .limit(safeLimit(req.query.limit, 50));

    return res.json({
      commands: commands.map((item) => ({
        id: item._id.toString(),
        commandType: item.commandType,
        payload: item.payload,
        status: item.status,
        resultMessage: item.resultMessage,
        requestedAt: item.requestedAt,
        acknowledgedAt: item.acknowledgedAt,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to fetch remote commands");
  }
});

router.post("/devices/:deviceId/commands", async (req, res) => {
  try {
    const device = await verifyOwnership(req.params.deviceId, req.parent.parentId);
    if (!device) return res.status(404).json({ message: "Device not found" });

    const body = commandSchema.parse(req.body);
    const command = await RemoteCommand.create({
      parentId: req.parent.parentId,
      deviceId: device._id,
      commandType: body.commandType,
      payload: body.payload ?? {},
    });

    const payload = {
      id: command._id.toString(),
      deviceId: device._id.toString(),
      commandType: command.commandType,
      status: command.status,
      requestedAt: command.requestedAt,
      payload: command.payload,
    };

    emitToParent(req.parent.parentId, "command:created", payload);

    return res.status(201).json(payload);
  } catch (error) {
    return handleRouteError(res, error, "Failed to create command");
  }
});

router.get("/overview", async (req, res) => {
  try {
    const devices = await ChildDevice.find({ parentId: req.parent.parentId });
    const deviceIds = devices.map((item) => item._id);

    const [locationCount, screenTimeCount, notificationCount, activityCount, pendingCommands] = await Promise.all([
      LocationLog.countDocuments({ deviceId: { $in: deviceIds } }),
      ScreenTimeLog.countDocuments({ deviceId: { $in: deviceIds } }),
      NotificationLog.countDocuments({ deviceId: { $in: deviceIds } }),
      DeviceActivityLog.countDocuments({ deviceId: { $in: deviceIds } }),
      RemoteCommand.countDocuments({ deviceId: { $in: deviceIds }, status: { $in: ["pending", "dispatched"] } }),
    ]);

    return res.json({
      stats: {
        devices: devices.length,
        locationLogs: locationCount,
        screenTimeLogs: screenTimeCount,
        notificationLogs: notificationCount,
        activityLogs: activityCount,
        pendingCommands,
      },
      devices: devices.map(mapDevice),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to build overview");
  }
});

export default router;
