import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getOrgSummary,
  getProjectSummary,
  getUserSummary,
} from "../controllers/workosControllers.js";

const router = express.Router();

router.get("/orgs/:id/summary", protect, getOrgSummary);
router.get("/projects/:id/summary", protect, getProjectSummary);
router.get("/users/:id/summary", protect, getUserSummary);

export default router;
