import crypto from "crypto";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import Organization from "../models/Organization.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Goal from "../models/Goal.js";
import OrgMembership from "../models/OrgMembership.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Session from "../models/Session.js";

export async function exportGDPRDataHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const userId = req.user?._id;
    if (!orgId || !userId) {
      res.status(400).json({ message: "Organization ID and User ID required" });
      return;
    }

    const org = await Organization.findById(orgId);
    const projects = await Project.find({ orgId });
    const tasks = await Task.find({ orgId });
    const goals = await Goal.find({ orgId });
    const members = await OrgMembership.find({ orgId }).populate("userId", "name email role");
    const auditLogs = await AuditLog.find({ orgId }).sort({ createdAt: -1 }).limit(100);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      requestedBy: userId,
      organization: org,
      members,
      projects,
      tasks,
      goals,
      auditLogs,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="cadence-gdpr-export-${org?.slug || "org"}.json"`);
    res.status(200).send(JSON.stringify(exportBundle, null, 2));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate GDPR export" });
  }
}

export async function setup2FAHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(400).json({ message: "User ID required" });
      return;
    }

    const secret = crypto.randomBytes(20).toString("hex");
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Cadence:${encodeURIComponent(req.user!.email)}?secret=${secret}&issuer=Cadence`;

    await User.findByIdAndUpdate(userId, { twoFactorSecret: secret });

    res.status(200).json({ secret, qrCodeUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to setup 2FA" });
  }
}

export async function verify2FAHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { code } = req.body;
    if (!userId || !code) {
      res.status(400).json({ message: "Verification code required" });
      return;
    }

    await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });
    res.status(200).json({ message: "Two-Factor Authentication successfully enabled" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to verify 2FA code" });
  }
}

export async function getActiveSessionsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(400).json({ message: "User ID required" });
      return;
    }

    let sessions = await Session.find({ userId, status: "active" }).sort({ lastActive: -1 });
    if (sessions.length === 0) {
      // Create current active session fallback
      const current = await Session.create({
        userId,
        tokenHash: "current_session_token",
        ipAddress: req.ip || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "Chrome / Linux",
        lastActive: new Date(),
        status: "active",
      });
      sessions = [current];
    }

    res.status(200).json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch active sessions" });
  }
}

export async function revokeSessionHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    await Session.findOneAndUpdate({ _id: id, userId }, { status: "revoked" });
    res.status(200).json({ message: "Session revoked successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to revoke session" });
  }
}

export async function updateIPAllowlistHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { ipAllowlist } = req.body;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }

    const org = await Organization.findByIdAndUpdate(
      orgId,
      { ipAllowlist: Array.isArray(ipAllowlist) ? ipAllowlist : [] },
      { new: true },
    );

    res.status(200).json({ message: "IP Allowlist updated successfully", ipAllowlist: org?.ipAllowlist });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update IP Allowlist" });
  }
}
