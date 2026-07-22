import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  assignSprintTasks,
} from "../controllers/sprintControllers.js";

const router = express.Router();

router.get("/", protect, listSprints);
router.get("/:id", protect, getSprintById);
router.post("/", protect, orgAdminOnly, createSprint);
router.put("/:id", protect, orgAdminOnly, updateSprint);
router.delete("/:id", protect, orgAdminOnly, deleteSprint);
router.put("/:id/tasks", protect, orgAdminOnly, assignSprintTasks);

export default router;
