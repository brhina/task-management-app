import type { Response } from "express";
import exceljs from "exceljs";
import AuditLog from "../models/AuditLog.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { sendCsv } from "../services/auditService.js";

export const listAuditLogs = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const {
      action,
      actorId,
      targetType,
      startDate,
      endDate,
      page = "1",
      limit = "50",
    } = req.query;

    const filter: Record<string, unknown> = { orgId: req.orgId };
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (targetType) filter.targetType = targetType;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actorId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter),
    ]);

    const actions = await AuditLog.distinct("action", { orgId: req.orgId });

    res.status(200).json({
      message: "Audit logs fetched",
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: { actions },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const exportAuditLogs = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { action, actorId, targetType, startDate, endDate, format } =
      req.query;
    const filter: Record<string, unknown> = { orgId: req.orgId };
    if (action) filter.action = action;
    if (actorId) filter.actorId = actorId;
    if (targetType) filter.targetType = targetType;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate ? { $gte: new Date(startDate as string) } : {}),
        ...(endDate ? { $lte: new Date(endDate as string) } : {}),
      };
    }

    const logs = await AuditLog.find(filter)
      .populate("actorId", "name email")
      .sort({ createdAt: -1 })
      .limit(10000);

    const rows = logs.map((log: any) => ({
      timestamp: log.createdAt?.toISOString?.() || "",
      actor: log.actorId?.name || "System",
      email: log.actorId?.email || "",
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId ? String(log.targetId) : "",
      metadata: log.metadata ? JSON.stringify(log.metadata) : "",
      ip: log.ip || "",
    }));

    if (format === "csv") {
      sendCsv(
        res,
        `audit-log-${Date.now()}.csv`,
        [
          "Timestamp",
          "Actor",
          "Email",
          "Action",
          "Target Type",
          "Target ID",
          "Metadata",
          "IP",
        ],
        rows.map((r) => [
          r.timestamp,
          r.actor,
          r.email,
          r.action,
          r.targetType,
          r.targetId,
          r.metadata,
          r.ip,
        ]),
      );
      return;
    }

    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet("Audit Log");
    sheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 24 },
      { header: "Actor", key: "actor", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Action", key: "action", width: 22 },
      { header: "Target Type", key: "targetType", width: 16 },
      { header: "Target ID", key: "targetId", width: 26 },
      { header: "Metadata", key: "metadata", width: 40 },
      { header: "IP", key: "ip", width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=audit-log-${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
