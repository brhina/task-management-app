import type { ExecutionContext } from "../config/context.js";

export function memoryResourceId(ctx: ExecutionContext): string {
  return `${ctx.orgId}:${ctx.userId}`;
}

export function orgScopedResourceId(orgId: string): string {
  return `org:${orgId}`;
}
