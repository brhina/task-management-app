import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getOrgSummary,
  getProjectSummary,
  getUserSummary,
  getWorkosScopes,
  executeWorkosAction,
} from "../controllers/workosControllers.js";

const router = express.Router();

router.get("/scopes", protect, getWorkosScopes);
router.post("/actions/execute", protect, executeWorkosAction);
router.get("/orgs/:id/summary", protect, getOrgSummary);
router.get("/projects/:id/summary", protect, getProjectSummary);
router.get("/users/:id/summary", protect, getUserSummary);

export default router;

