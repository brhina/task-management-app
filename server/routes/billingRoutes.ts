import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import { getBillingMetricsHandler, updatePlanHandler } from "../controllers/billingControllers.js";

const router = Router();

router.use(protect as any);

router.get("/metrics", getBillingMetricsHandler as any);
router.post("/upgrade", updatePlanHandler as any);

export default router;
