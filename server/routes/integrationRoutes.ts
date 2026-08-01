import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getICalFeedHandler,
  linkGitHubPRHandler,
  slackWebhookNotifyHandler,
} from "../controllers/integrationControllers.js";

const router = Router();

// Public token-authenticated iCal feed endpoint
router.get("/calendar/ics", getICalFeedHandler as any);

// Protected routes for integrations
router.use(protect as any);

router.post("/github/link", linkGitHubPRHandler as any);
router.post("/slack/notify", slackWebhookNotifyHandler as any);

export default router;
