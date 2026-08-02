import { Router } from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  createApiKeyHandler,
  getApiKeysHandler,
  revokeApiKeyHandler,
} from "../controllers/apiKeyControllers.js";

const router = Router();

router.use(protect as any);
router.use(orgAdminOnly as any);

router.post("/", createApiKeyHandler as any);
router.get("/", getApiKeysHandler as any);
router.delete("/:id", revokeApiKeyHandler as any);

export default router;
