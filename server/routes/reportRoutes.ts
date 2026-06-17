import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  exportTasksReport,
  exportUsersReport,
  exportProjectsReport,
  exportGoalsReport,
  getReportSummary,
} from "../controllers/reportControllers.js";

const router = express.Router();

router.get("/summary", protect, orgAdminOnly, getReportSummary);
router.get("/export-tasks", protect, orgAdminOnly, exportTasksReport);
router.get("/export-users", protect, orgAdminOnly, exportUsersReport);
router.get("/export-projects", protect, orgAdminOnly, exportProjectsReport);
router.get("/export-goals", protect, orgAdminOnly, exportGoalsReport);

export default router;
