import mongoose from "mongoose";

const deviceActivityLogSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    eventType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    metadata: { type: Object, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("DeviceActivityLog", deviceActivityLogSchema);
