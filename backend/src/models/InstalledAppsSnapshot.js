import mongoose from "mongoose";

const installedAppSchema = new mongoose.Schema(
  {
    packageName: { type: String, required: true },
    appName: { type: String, required: true },
    versionName: { type: String, default: "" },
    systemApp: { type: Boolean, default: false },
  },
  { _id: false },
);

const installedAppsSnapshotSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    apps: { type: [installedAppSchema], default: [] },
    capturedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("InstalledAppsSnapshot", installedAppsSnapshotSchema);
