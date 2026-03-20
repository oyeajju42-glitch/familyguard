import mongoose from "mongoose";

const locationLogSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracyMeters: { type: Number },
    batteryLevel: { type: Number },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("LocationLog", locationLogSchema);
