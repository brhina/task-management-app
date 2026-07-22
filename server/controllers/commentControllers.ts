import { Response } from "express";
import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import TaskActivity from "../models/TaskActivity.js";
import User from "../models/User.js";
import OrgMembership from "../models/OrgMembership.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { logTaskActivity } from "../services/activityLogger.js";

async function resolveMentions(
  content: string,
  orgId: string,
): Promise<string[]> {
  const names = [...content.matchAll(/@([\w.\-]+)/g)].map((m) => m[1]);
  if (names.length === 0) return [];

  const memberships = await OrgMembership.find({
    orgId,
    status: "Active",
  }).select("userId");
  const userIds = memberships.map((m) => m.userId);
  const users = await User.find({
    _id: { $in: userIds },
    $or: names.map((n) => ({
      name: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
    })),
  }).select("_id name");

  return users.map((u) => String(u._id));
}

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
    if (!isOwner && req.membershipRole !== "OrgAdmin") {
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
