import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const normalizeValue = (value) => (typeof value === "string" ? value.trim() : value);

const schema = z.object({
  PORT: z.preprocess(normalizeValue, z.string().min(1)),
  MONGO_URI: z.preprocess(normalizeValue, z.string().min(1)),
  JWT_SECRET: z.preprocess(normalizeValue, z.string().min(16)),
  PAIRING_CODE: z.preprocess(normalizeValue, z.string().min(1)),
  CORS_ORIGIN: z.preprocess(normalizeValue, z.string().min(1)),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Missing or invalid required environment variables.");
}

export const env = parsed.data;
