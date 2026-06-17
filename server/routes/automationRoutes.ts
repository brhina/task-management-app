import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  runDailySummaryJob,
} from "../controllers/automationControllers.js";

const router = express.Router();

router.get("/rules", protect, orgAdminOnly, listAutomationRules);
router.post("/rules", protect, orgAdminOnly, createAutomationRule);
router.put("/rules/:id", protect, orgAdminOnly, updateAutomationRule);
router.delete("/rules/:id", protect, orgAdminOnly, deleteAutomationRule);

router.post("/jobs/daily-summary", protect, orgAdminOnly, runDailySummaryJob);

export default router;
