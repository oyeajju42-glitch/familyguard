import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  { _id: false },
);

const contactsSnapshotSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ChildDevice", index: true },
    contacts: { type: [contactSchema], default: [] },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ContactsSnapshot", contactsSnapshotSchema);
