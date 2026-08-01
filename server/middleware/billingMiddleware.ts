import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware.js";
import Organization from "../models/Organization.js";

const TIER_HIERARCHY: Record<string, number> = {
  Free: 1,
  Pro: 2,
  Enterprise: 3,
};

export function requirePlanTier(requiredTier: "Free" | "Pro" | "Enterprise") {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.orgId;
      if (!orgId) {
        res.status(400).json({ message: "Organization ID required" });
        return;
      }

      const org = await Organization.findById(orgId);
      const currentPlan = org?.plan || "Free";

      if (TIER_HIERARCHY[currentPlan] < TIER_HIERARCHY[requiredTier]) {
        res.status(403).json({
          message: `This feature requires a ${requiredTier} subscription plan. Your org is currently on ${currentPlan}.`,
          currentPlan,
          requiredTier,
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to verify plan tier" });
    }
  };
}
