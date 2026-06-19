import { RequestContext } from "@mastra/core/request-context";
import type { ExecutionContext } from "../config/context.js";
import { EXECUTION_CONTEXT_KEY } from "../config/context.js";

export function getExecutionContext(
  requestContext?: RequestContext | Record<string, unknown>,
): ExecutionContext {
  let ctx: ExecutionContext | undefined;

  if (requestContext && typeof (requestContext as any).get === "function") {
    ctx = (requestContext as RequestContext).get(EXECUTION_CONTEXT_KEY) as ExecutionContext;
  } else if (requestContext && typeof requestContext === "object") {
    ctx = (requestContext as Record<string, unknown>)[EXECUTION_CONTEXT_KEY] as ExecutionContext;
  }

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
