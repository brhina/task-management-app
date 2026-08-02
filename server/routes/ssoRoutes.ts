import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getSSOConfigHandler,
  updateSSOConfigHandler,
  ssoLoginInitiateHandler,
  ssoCallbackHandler,
  getSPMetadataHandler,
  testSSOConnectionHandler,
} from "../controllers/ssoControllers.js";

const router = Router();

// Public routes for SSO login
router.post("/login/initiate", ssoLoginInitiateHandler as any);
router.post("/login/callback", ssoCallbackHandler as any);

// Protected routes for SSO configuration
router.use(protect as any);

router.get("/config", getSSOConfigHandler as any);
router.put("/config", updateSSOConfigHandler as any);
router.get("/sp-metadata", getSPMetadataHandler as any);
router.post("/test-connection", testSSOConnectionHandler as any);

export default router;
