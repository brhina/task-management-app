import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  getDashboardTasks,
  getUserDashboardTasks,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  updateTaskAssignee,
  updateTaskCheckList,
  deleteTask,
} from "../controllers/taskControllers.js";
import {
  validate,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskChecklistSchema,
} from "../middleware/validate.js";

const router = express.Router();

router.get("/dashboard-tasks", protect, getDashboardTasks);
router.get("/user-dashboard-tasks", protect, getUserDashboardTasks);
router.get("/", protect, getTasks);
router.get("/:id", protect, getTaskById);
router.post("/", protect, orgAdminOnly, validate(createTaskSchema), createTask);
router.put("/:id", protect, orgAdminOnly, validate(updateTaskSchema), updateTask);
router.delete("/:id", protect, orgAdminOnly, deleteTask);
router.put(
  "/:id/status",
  protect,
  validate(updateTaskStatusSchema),
  updateTaskStatus,
);
router.put("/:id/assignee", protect, orgAdminOnly, updateTaskAssignee);
router.put(
  "/:id/todo",
  protect,
  validate(updateTaskChecklistSchema),
  updateTaskCheckList,
);

export default router;
