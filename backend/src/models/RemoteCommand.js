import mongoose from "mongoose";

const remoteCommandSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    commandType: {
      type: String,
      enum: ["ping", "lock-screen-intent", "request-location-now", "request-sync-now"],
      required: true,
    },
    payload: { type: Object, default: {} },
    status: {
      type: String,
      enum: ["pending", "dispatched", "acknowledged", "executed", "failed"],
      default: "pending",
      index: true,
    },
    resultMessage: { type: String, default: "" },
    requestedAt: { type: Date, default: Date.now, index: true },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("RemoteCommand", remoteCommandSchema);
