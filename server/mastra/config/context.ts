import type { OrgRole } from "../../models/OrgMembership.js";

export interface ExecutionContext {
  orgId: string;
  userId: string;
  role: OrgRole;
}

export const EXECUTION_CONTEXT_KEY = "executionContext";

export function buildResourceId(ctx: ExecutionContext): string {
  return `${ctx.orgId}:${ctx.userId}`;
}

export function buildThreadId(ctx: ExecutionContext, suffix?: string): string {
  return suffix
    ? `${ctx.orgId}:${ctx.userId}:${suffix}`
    : `${ctx.orgId}:${ctx.userId}:default`;
}
