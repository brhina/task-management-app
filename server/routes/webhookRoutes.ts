import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getWebhooksHandler,
  createWebhookHandler,
  deleteWebhookHandler,
} from "../controllers/webhookControllers.js";

const router = Router();

router.use(protect as any);

router.get("/", getWebhooksHandler as any);
router.post("/", createWebhookHandler as any);
router.delete("/:id", deleteWebhookHandler as any);

export default router;
