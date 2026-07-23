import { Response } from "express";
import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import TaskActivity from "../models/TaskActivity.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { isOrgOwnerRole } from "../constants/permissions.js";
import { logTaskActivity } from "../services/activityLogger.js";
import { resolveMentions } from "../utils/mentions.js";
import { notifyUser, notifyMany } from "../services/notificationService.js";

export const listComments = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const comments = await Comment.find({
      orgId: req.orgId,
      taskId: req.params.id,
    })
      .sort({ createdAt: 1 })
      .populate("userId", "name email profileImageUrl")
      .populate("mentions", "name email");

    res.status(200).json({ message: "Comments fetched", data: comments });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createComment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { content, parentCommentId } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ message: "Content is required" });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const mentions = await resolveMentions(content, String(req.orgId));
    const taskId = String(req.params.id);

    const comment = await Comment.create({
      orgId: req.orgId,
      taskId,
      userId: req.user._id,
      content: content.trim(),
      mentions,
      parentCommentId,
    });

    await logTaskActivity({
      orgId: req.orgId,
      taskId,
      actorId: req.user._id,
      action: "comment_added",
      meta: { commentId: String(comment._id) },
    });

    const link = `/user/task/${taskId}`;
    const actorName = req.user.name || "Someone";

    // Notify assignee about comment
    await notifyUser({
      orgId: String(req.orgId),
      userId: String(task.assignedTo),
      type: "comment_added",
      title: "New comment on your task",
      message: `${actorName} commented on "${task.title}"`,
      link,
      actorId: String(req.user._id),
      meta: { taskId, commentId: String(comment._id) },
    });

    // Notify mentioned users
    if (mentions.length > 0) {
      await notifyMany(mentions, {
        orgId: String(req.orgId),
        type: "mention",
        title: "You were mentioned",
        message: `${actorName} mentioned you on "${task.title}"`,
        link,
        actorId: String(req.user._id),
        meta: { taskId, commentId: String(comment._id) },
      });
    }

    const populated = await Comment.findById(comment._id)
      .populate("userId", "name email profileImageUrl")
      .populate("mentions", "name email");

    res.status(201).json({ message: "Comment created", data: populated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteComment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const comment = await Comment.findOne({
      _id: req.params.commentId,
      orgId: req.orgId,
    });
    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    const isOwner = String(comment.userId) === String(req.user._id);
    if (!isOwner && !isOrgOwnerRole(req.membershipRole)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    await comment.deleteOne();
    await logTaskActivity({
      orgId: req.orgId,
      taskId: comment.taskId,
      actorId: req.user._id,
      action: "comment_deleted",
    });

    res.status(200).json({ message: "Comment deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listActivity = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const activity = await TaskActivity.find({
      orgId: req.orgId,
      taskId: req.params.id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actorId", "name email profileImageUrl");

    res.status(200).json({ message: "Activity fetched", data: activity });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
