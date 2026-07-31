import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  listNotifications,
  markRead,
  markUnread,
  markAllRead,
  deleteNotification,
  clearNotifications,
  getPreferences,
  updatePreferences,
  getPresence,
} from "../controllers/notificationControllers.js";

const router = express.Router();

router.get("/preferences", protect, getPreferences);
router.put("/preferences", protect, updatePreferences);
router.get("/presence", protect, getPresence);
router.put("/read-all", protect, markAllRead);
router.delete("/clear", protect, clearNotifications);
router.get("/", protect, listNotifications);
router.put("/:id/read", protect, markRead);
router.put("/:id/unread", protect, markUnread);
router.delete("/:id", protect, deleteNotification);

export default router;
