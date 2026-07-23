import type { Response } from "express";
import AuditLog from "../models/AuditLog.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

export interface AuditParams {
  orgId: mongoose.Types.ObjectId | string;
  actorId?: mongoose.Types.ObjectId | string;
  action: string;
  targetType: string;
  targetId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await AuditLog.create({
      orgId: params.orgId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export async function auditFromRequest(
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId?: mongoose.Types.ObjectId | string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!req.orgId) return;
  await writeAuditLog({
    orgId: req.orgId,
    actorId: req.user?._id,
    action,
    targetType,
    targetId,
    metadata,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get?.("user-agent") || undefined,
  });
}

/** Fire-and-forget helper that never blocks the response. */
export function auditAsync(
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId?: mongoose.Types.ObjectId | string,
  metadata?: Record<string, unknown>,
): void {
  void auditFromRequest(req, action, targetType, targetId, metadata);
}

export function sendCsv(
  res: Response,
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  res.status(200).send(lines.join("\n"));
}
