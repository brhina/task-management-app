import { Router } from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  exportGDPRDataHandler,
  setup2FAHandler,
  verify2FAHandler,
  getActiveSessionsHandler,
  revokeSessionHandler,
  updateIPAllowlistHandler,
  getIPAllowlistHandler,
  updateSecurityPolicyHandler,
} from "../controllers/complianceControllers.js";

const router = Router();

router.use(protect as any);

// User-level security
router.post("/2fa/setup", setup2FAHandler as any);
router.post("/2fa/verify", verify2FAHandler as any);

// Enterprise compliance endpoints
router.get("/export", orgAdminOnly as any, exportGDPRDataHandler as any);
router.get("/sessions", orgAdminOnly as any, getActiveSessionsHandler as any);
router.delete("/sessions/:id", orgAdminOnly as any, revokeSessionHandler as any);
router.get("/ip-allowlist", orgAdminOnly as any, getIPAllowlistHandler as any);
router.put("/ip-allowlist", orgAdminOnly as any, updateIPAllowlistHandler as any);
router.put("/security-policy", orgAdminOnly as any, updateSecurityPolicyHandler as any);

export default router;
