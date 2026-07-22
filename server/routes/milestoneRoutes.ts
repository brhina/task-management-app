import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  linkMilestoneTasks,
} from "../controllers/milestoneControllers.js";

const router = express.Router();

router.get("/", protect, listMilestones);
router.get("/:id", protect, getMilestoneById);
router.post("/", protect, orgAdminOnly, createMilestone);
router.put("/:id", protect, orgAdminOnly, updateMilestone);
router.delete("/:id", protect, orgAdminOnly, deleteMilestone);
router.put("/:id/tasks", protect, orgAdminOnly, linkMilestoneTasks);

export default router;
