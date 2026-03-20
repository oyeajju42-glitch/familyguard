import mongoose from "mongoose";

export const connectDb = async (mongoUri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("MongoDB connected");
};
