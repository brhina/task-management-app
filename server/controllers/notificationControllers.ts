import { Response } from "express";
import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { getTaskViewers } from "../services/socketService.js";

export const listNotifications = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const unreadOnly = req.query.unread === "true";
    const filter: Record<string, unknown> = { userId: req.user._id };
    if (req.orgId) filter.orgId = req.orgId;
    if (unreadOnly) filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      ...(req.orgId ? { orgId: req.orgId } : {}),
      read: false,
    });

    res.status(200).json({
      message: "Notifications fetched",
      data: { notifications, unreadCount },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const n = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!n) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    n.read = true;
    await n.save();
    res.status(200).json({ message: "Marked as read", data: n });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markUnread = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const n = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!n) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    n.read = false;
    await n.save();
    res.status(200).json({ message: "Marked as unread", data: n });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {
      userId: req.user._id,
      read: false,
    };
    if (req.orgId) filter.orgId = req.orgId;
    const result = await Notification.updateMany(filter, { read: true });
    res.status(200).json({
      message: "All marked as read",
      data: { modified: result.modifiedCount },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPreferences = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    let prefs = await NotificationPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: req.user._id });
    }
    res.status(200).json({ message: "Preferences fetched", data: prefs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePreferences = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    let prefs = await NotificationPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: req.user._id });
    }

    const fields = [
      "taskAssigned",
      "mentions",
      "statusChanged",
      "comments",
      "dueDateReminder",
      "digestFrequency",
    ] as const;

    for (const f of fields) {
      if (req.body[f] !== undefined) (prefs as any)[f] = req.body[f];
    }
    await prefs.save();
    res.status(200).json({ message: "Preferences updated", data: prefs });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPresence = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const taskId = req.query.taskId as string;
    if (!taskId) {
      res.status(400).json({ message: "taskId is required" });
      return;
    }
    const viewers = getTaskViewers(taskId);
    res.status(200).json({ message: "Presence", data: viewers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
