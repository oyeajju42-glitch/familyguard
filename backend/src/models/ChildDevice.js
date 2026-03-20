import mongoose from "mongoose";

const childDeviceSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    childName: { type: String, required: true, trim: true },
    deviceLabel: { type: String, required: true, trim: true },
    platformVersion: { type: String, required: true },
    transparencyNoticeVersion: { type: String, required: true },
    consentAcceptedAt: { type: String, required: true },
    deviceToken: { type: String, required: true },
    status: { type: String, enum: ["online", "offline"], default: "online" },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

childDeviceSchema.index({ parentId: 1, deviceLabel: 1 }, { unique: true });

export default mongoose.model("ChildDevice", childDeviceSchema);
