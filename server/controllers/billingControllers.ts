import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { getOrgBillingMetrics, upgradeOrgPlan } from "../services/billingService.js";

export async function getBillingMetricsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      res.status(400).json({ message: "Organization ID required" });
      return;
    }
    const metrics = await getOrgBillingMetrics(orgId);
    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch billing metrics" });
  }
}

export async function updatePlanHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const orgId = req.orgId;
    const { plan } = req.body;
    if (!orgId || !plan || !["Free", "Pro", "Enterprise"].includes(plan)) {
      res.status(400).json({ message: "Valid plan tier (Free, Pro, Enterprise) required" });
      return;
    }
    const updated = await upgradeOrgPlan(orgId, plan);
    res.status(200).json({ message: `Successfully updated organization plan to ${plan}`, org: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update subscription plan" });
  }
}
