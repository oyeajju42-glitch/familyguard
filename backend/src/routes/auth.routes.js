import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import ParentUser from "../models/ParentUser.js";
import { env } from "../config/env.js";

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  parentId: z.string().min(3).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await ParentUser.findOne({ email: body.email.toLowerCase() });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const parentId = body.parentId ?? `parent_${Date.now()}`;

    const user = await ParentUser.create({
      parentId,
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
    });

    return res.status(201).json({
      id: user._id.toString(),
      parentId: user.parentId,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.flatten() });
    }
    return res.status(500).json({ message: "Unable to register parent" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await ParentUser.findOne({ email: body.email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        type: "parent",
        parentUserId: user._id.toString(),
        parentId: user.parentId,
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        parentId: user.parentId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: error.flatten() });
    }
    return res.status(500).json({ message: "Unable to login" });
  }
});

export default router;
