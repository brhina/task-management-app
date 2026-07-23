import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
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
  uploadTaskAttachment,
  deleteTaskAttachment,
  listSubtasks,
  reorderSubtasks,
} from "../controllers/taskControllers.js";
import {
  listComments,
  createComment,
  deleteComment,
  listActivity,
} from "../controllers/commentControllers.js";
import {
  startTimer,
  stopTimer,
} from "../controllers/timeEntryControllers.js";
import { saveTaskAsTemplate } from "../controllers/taskTemplateControllers.js";
import {
  validate,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskChecklistSchema,
} from "../middleware/validate.js";
import { taskUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/dashboard-tasks", protect, getDashboardTasks);
router.get("/user-dashboard-tasks", protect, getUserDashboardTasks);
router.get("/", protect, getTasks);
router.get("/:id", protect, getTaskById);
router.post("/", protect, requirePermission("task:create"), validate(createTaskSchema), createTask);
router.put("/:id", protect, requirePermission("task:update"), validate(updateTaskSchema), updateTask);
router.delete("/:id", protect, requirePermission("task:delete"), deleteTask);
router.put(
  "/:id/status",
  protect,
  validate(updateTaskStatusSchema),
  updateTaskStatus,
);
router.put("/:id/assignee", protect, requirePermission("task:assign"), updateTaskAssignee);
router.put(
  "/:id/todo",
  protect,
  validate(updateTaskChecklistSchema),
  updateTaskCheckList,
);

router.get("/:id/comments", protect, listComments);
router.post("/:id/comments", protect, createComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);
router.get("/:id/activity", protect, listActivity);

router.post(
  "/:id/attachments",
  protect,
  taskUpload.single("file"),
  uploadTaskAttachment,
);
router.delete(
  "/:id/attachments/:attachmentId",
  protect,
  requirePermission("task:update"),
  deleteTaskAttachment,
);

router.get("/:id/subtasks", protect, listSubtasks);
router.put("/:id/subtasks/reorder", protect, requirePermission("task:update"), reorderSubtasks);

router.post("/:id/timer/start", protect, startTimer);
router.post("/:id/timer/stop", protect, stopTimer);
router.post("/:id/save-as-template", protect, requirePermission("template:manage"), saveTaskAsTemplate);

export default router;
