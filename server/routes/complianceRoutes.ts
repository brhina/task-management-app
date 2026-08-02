import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
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

router.get("/export", exportGDPRDataHandler as any);
router.post("/2fa/setup", setup2FAHandler as any);
router.post("/2fa/verify", verify2FAHandler as any);
router.get("/sessions", getActiveSessionsHandler as any);
router.delete("/sessions/:id", revokeSessionHandler as any);
router.get("/ip-allowlist", getIPAllowlistHandler as any);
router.put("/ip-allowlist", updateIPAllowlistHandler as any);
router.put("/security-policy", updateSecurityPolicyHandler as any);

export default router;
