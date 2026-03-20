import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    packageName: { type: String, required: true },
    appName: { type: String, required: true },
    title: { type: String, required: true },
    text: { type: String, default: "" },
    postedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("NotificationLog", notificationLogSchema);
