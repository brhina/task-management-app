import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import ApiKey from "../models/ApiKey.js";
import { AuthRequest } from "./authMiddleware.js";

export async function apiKeyAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const headerKey = req.headers["x-api-key"] as string || req.headers["authorization"]?.replace("Bearer ", "");
  if (!headerKey || !headerKey.startsWith("cad_live_")) {
    next();
    return;
  }

  const keyHash = crypto.createHash("sha256").update(headerKey).digest("hex");
  const keyDoc = await ApiKey.findOne({ keyHash, status: "active" });

  if (!keyDoc) {
    res.status(401).json({ message: "Invalid or revoked API Key" });
    return;
  }

  if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
    res.status(401).json({ message: "API Key has expired" });
    return;
  }

  keyDoc.lastUsedAt = new Date();
  await keyDoc.save();

  req.orgId = keyDoc.orgId;
  req.isApiKey = true;
  next();
}
