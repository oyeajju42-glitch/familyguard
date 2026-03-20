import mongoose from "mongoose";

const parentUserSchema = new mongoose.Schema(
  {
    parentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ParentUser", parentUserSchema);
