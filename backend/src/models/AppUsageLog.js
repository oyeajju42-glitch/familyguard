import mongoose from "mongoose";

const appUsageLogSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    packageName: { type: String, required: true },
    appName: { type: String, required: true },
    minutes: { type: Number, required: true },
    date: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("AppUsageLog", appUsageLogSchema);
