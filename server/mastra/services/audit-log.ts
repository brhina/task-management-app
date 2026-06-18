export interface AuditEntry {
  orgId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const auditLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, "timestamp">) {
  auditLog.push({ ...entry, timestamp: new Date() });
  if (process.env.NODE_ENV !== "production") {
    console.log("[audit]", JSON.stringify(entry));
  }
}

export function getRecentAudit(orgId: string, limit = 100): AuditEntry[] {
  return auditLog
    .filter((e) => e.orgId === orgId)
    .slice(-limit);
}
