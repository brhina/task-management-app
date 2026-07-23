import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
import {
  exportTasksReport,
  exportUsersReport,
  exportProjectsReport,
  exportGoalsReport,
  getReportSummary,
} from "../controllers/reportControllers.js";
import {
  getTrends,
  getTeamPerformance,
  getSprintVelocityReport,
  getBurndown,
  getCumulativeFlow,
  getProjectHealth,
  getWorkloadHeatmap,
  getAnalyticsDashboard,
} from "../controllers/analyticsControllers.js";

const router = express.Router();

router.get("/summary", protect, requirePermission("report:view"), getReportSummary);
router.get(
  "/analytics",
  protect,
  requirePermission("report:view"),
  getAnalyticsDashboard,
);
router.get("/trends", protect, requirePermission("report:view"), getTrends);
router.get(
  "/team-performance",
  protect,
  requirePermission("report:view"),
  getTeamPerformance,
);
router.get(
  "/sprint-velocity",
  protect,
  requirePermission("report:view"),
  getSprintVelocityReport,
);
router.get("/burndown", protect, requirePermission("report:view"), getBurndown);
router.get(
  "/cumulative-flow",
  protect,
  requirePermission("report:view"),
  getCumulativeFlow,
);
router.get(
  "/project-health",
  protect,
  requirePermission("report:view"),
  getProjectHealth,
);
router.get(
  "/workload-heatmap",
  protect,
  requirePermission("report:view"),
  getWorkloadHeatmap,
);

router.get(
  "/export-tasks",
  protect,
  requirePermission("report:export"),
  exportTasksReport,
);
router.get(
  "/export-users",
  protect,
  requirePermission("report:export"),
  exportUsersReport,
);
router.get(
  "/export-projects",
  protect,
  requirePermission("report:export"),
  exportProjectsReport,
);
router.get(
  "/export-goals",
  protect,
  requirePermission("report:export"),
  exportGoalsReport,
);

export default router;
