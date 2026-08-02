import { Router } from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import { getOrgBrandingHandler, updateOrgBrandingHandler } from "../controllers/brandingControllers.js";

const router = Router();

router.use(protect as any);

router.get("/", getOrgBrandingHandler as any);
router.put("/", orgAdminOnly as any, updateOrgBrandingHandler as any);

export default router;
