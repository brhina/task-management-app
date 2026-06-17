import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  linkGoalToProject,
  unlinkGoalFromProject,
} from "../controllers/goalControllers.js";

const router = express.Router();

router.get("/", protect, listGoals);
router.get("/:id", protect, getGoalById);
router.post("/", protect, orgAdminOnly, createGoal);
router.put("/:id", protect, orgAdminOnly, updateGoal);
router.delete("/:id", protect, orgAdminOnly, deleteGoal);

router.post("/:id/link-project", protect, orgAdminOnly, linkGoalToProject);
router.post(
  "/:id/unlink-project",
  protect,
  orgAdminOnly,
  unlinkGoalFromProject,
);

export default router;
