import { RequestContext } from "@mastra/core/request-context";
import type { ExecutionContext } from "../config/context.js";
import { EXECUTION_CONTEXT_KEY } from "../config/context.js";

export function getExecutionContext(
  requestContext?: RequestContext,
): ExecutionContext {
  const ctx = requestContext?.get(EXECUTION_CONTEXT_KEY) as
    | ExecutionContext
    | undefined;
  if (!ctx?.orgId || !ctx?.userId) {
    throw new Error("Execution context (orgId, userId) is required");
  }
  return ctx;
}

export function createRequestContext(ctx: ExecutionContext): RequestContext {
  const rc = new RequestContext();
  rc.set(EXECUTION_CONTEXT_KEY, ctx);
  return rc;
}
