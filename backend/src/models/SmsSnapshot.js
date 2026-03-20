import mongoose from "mongoose";

const smsMessageSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ["inbox", "sent", "draft", "other"], default: "other" },
    timestamp: { type: String, required: true },
  },
  { _id: false },
);

const smsSnapshotSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    messages: { type: [smsMessageSchema], default: [] },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("SmsSnapshot", smsSnapshotSchema);
