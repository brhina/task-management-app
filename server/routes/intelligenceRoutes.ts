import { Router } from "express";
import protect from "../middleware/authMiddleware.js";
import {
  planProject,
  applyProjectPlan,
  breakdownTask,
  analyzeRisksHandler,
  planSprint,
  generateReport,
  generateOkrsHandler,
  analyzeDependenciesHandler,
  getPortfolio,
  orchestrate,
  getRecommendations,
  patchRecommendation,
  getWorkflowRunHandler,
  queryRag,
  scheduleRiskMonitoring,
  scheduleExecutiveReporting,
} from "../controllers/intelligenceControllers.js";

const router = Router();

router.use(protect);

router.post("/plan-project", planProject);
router.post("/plan-project/apply", applyProjectPlan);
router.post("/breakdown-task", breakdownTask);
router.post("/analyze-risks", analyzeRisksHandler);
router.post("/plan-sprint", planSprint);
router.post("/reports/:type", generateReport);
router.post("/okrs/generate", generateOkrsHandler);
router.post("/dependencies/analyze", analyzeDependenciesHandler);
router.get("/portfolio", getPortfolio);
router.post("/orchestrate", orchestrate);
router.get("/recommendations", getRecommendations);
router.patch("/recommendations/:id", patchRecommendation);
router.get("/workflow-runs/:id", getWorkflowRunHandler);
router.post("/query", queryRag);
router.post("/jobs/risk-monitoring", scheduleRiskMonitoring);
router.post("/jobs/executive-reporting", scheduleExecutiveReporting);

export default router;
