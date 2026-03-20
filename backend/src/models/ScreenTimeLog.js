import mongoose from "mongoose";

const appBreakdownSchema = new mongoose.Schema(
  {
    packageName: { type: String, required: true },
    minutes: { type: Number, required: true },
  },
  { _id: false },
);

const screenTimeLogSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    date: { type: String, required: true },
    totalMinutes: { type: Number, required: true },
    appBreakdown: { type: [appBreakdownSchema], default: [] },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ScreenTimeLog", screenTimeLogSchema);
