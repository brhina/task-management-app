import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import ApiKey from "../models/ApiKey.js";

export async function createApiKeyHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const userId = req.user?._id;
    const { name, scopes, expirationDays } = req.body;

    if (!orgId || !userId || !name) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    const randomBytes = crypto.randomBytes(24).toString("hex");
    const secretKey = `cad_live_${randomBytes}`;
    const keyPrefix = secretKey.slice(0, 14);
    const keyHash = crypto.createHash("sha256").update(secretKey).digest("hex");

    let expiresAt: Date | undefined = undefined;
    if (expirationDays && Number(expirationDays) > 0) {
      expiresAt = new Date(Date.now() + Number(expirationDays) * 86400000);
    }

    const apiKey = await ApiKey.create({
      orgId,
      name,
      keyPrefix,
      keyHash,
      scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ["read"],
      expiresAt,
      createdBy: userId,
      status: "active",
    });

    res.status(201).json({
      secretKey, // Return once
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create API key" });
  }
}

export async function getApiKeysHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const keys = await ApiKey.find({ orgId }).sort({ createdAt: -1 }).select("-keyHash");
    res.status(200).json(keys);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch API keys" });
  }
}

export async function revokeApiKeyHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { id } = req.params;
    await ApiKey.findOneAndUpdate({ _id: id, orgId }, { status: "revoked" });
    res.status(200).json({ message: "API key revoked successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to revoke API key" });
  }
}
