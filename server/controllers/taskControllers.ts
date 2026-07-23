import { Response } from "express";
import Task from "../models/Task.js";
import Dependency from "../models/Dependency.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";
import { runAutomations } from "../services/automationRunner.js";
import { logTaskActivity } from "../services/activityLogger.js";
import { rollupParentProgress } from "../services/subtaskRollup.js";
import { saveUploadedFile, deleteStoredFile } from "../services/fileStorage.js";
import {
  notifyUser,
  notifyMany,
  broadcastTaskUpdate,
} from "../services/notificationService.js";
import { resolveMentions } from "../utils/mentions.js";
import { isOrgOwnerRole } from "../constants/permissions.js";

const isOrgElevated = (role: string | undefined) => isOrgOwnerRole(role);

const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      projectId,
      search,
      page: pageStr,
      limit: limitStr,
      parentTaskId,
      sprintId,
      topLevel,
    } = req.query;
    const page = Math.max(1, parseInt(pageStr as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr as string, 10) || 50));
    const skip = (page - 1) * limit;

    let filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (projectId) {
      filter.projectId = projectId;
    }

    if (parentTaskId) {
      filter.parentTaskId = parentTaskId;
    } else if (topLevel === "true") {
      filter.parentTaskId = { $exists: false };
    }

    if (sprintId) {
      filter.sprintId = sprintId;
    }

    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    filter.orgId = new mongoose.Types.ObjectId(req.orgId);

    // Custom field filters: customField.<key>=value
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith("customField.") && value !== undefined) {
        const fieldKey = key.slice("customField.".length);
        filter[`customFields.${fieldKey}`] = value;
      }
    }

    const isSearch = Boolean(search);

    if (isSearch) {
      filter.$text = { $search: search as string };
    }

    let baseFilter = isOrgElevated(req.membershipRole)
      ? filter
      : { ...filter, assignedTo: req.user._id };

    const projection = isSearch ? { score: { $meta: "textScore" } } : {};
    const sortOptions: any = isSearch
      ? { score: { $meta: "textScore" }, createdAt: -1 }
      : { createdAt: -1 };

    const total = await Task.countDocuments(baseFilter);

    let tasks = await Task.find(baseFilter, projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email profileImageUrl");

    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const completedCount = task.todoCheckList.filter(
          (todo) => todo.isCompleted === true,
        ).length;
        const totalCount = task.todoCheckList.length;
        const progress =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        return {
          ...task.toObject(),
          completedCount,
          totalCount,
          progress,
        };
      }),
    );

    const allTasks = await Task.countDocuments(
      isOrgElevated(req.membershipRole)
        ? { orgId: filter.orgId }
        : { ...filter, assignedTo: req.user._id },
    );

    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "Pending",
      ...(!isOrgElevated(req.membershipRole) && { assignedTo: req.user._id }),
    });

    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "In Progress",
      ...(!isOrgElevated(req.membershipRole) && { assignedTo: req.user._id }),
    });

    const inReviewTasks = await Task.countDocuments({
      ...filter,
      status: "In Review",
      ...(!isOrgElevated(req.membershipRole) && { assignedTo: req.user._id }),
    });

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "Completed",
      ...(!isOrgElevated(req.membershipRole) && { assignedTo: req.user._id }),
    });

    res.status(200).json({
      message: "Tasks fetched successfully",
      data: {
        tasks: enrichedTasks,
        statusSummary: {
          all: allTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          inReview: inReviewTasks,
          completed: completedTasks,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const task = await Task.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    }).populate("assignedTo", "name email profileImageUrl");

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.status(200).json({ message: "Task fetched successfully", data: task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      startDate,
      assignedTo,
      todoCheckList,
      projectId,
      goalIds,
      tags,
      category,
      impactScore,
      effortHours,
      collaborators,
      blockersText,
      parentTaskId,
      sortOrder,
      sprintId,
      customFields,
      recurrence,
    } = req.body;

    if (!assignedTo) {
      res.status(400).json({ message: "Assigned to is required" });
      return;
    }
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    if (parentTaskId) {
      const parent = await Task.findOne({ _id: parentTaskId, orgId: req.orgId });
      if (!parent) {
        res.status(404).json({ message: "Parent task not found" });
        return;
      }
    }

    const task = await Task.create({
      orgId: req.orgId,
      title,
      description,
      priority,
      dueDate,
      startDate,
      projectId,
      goalIds,
      tags,
      category,
      impactScore,
      effortHours,
      collaborators,
      blockersText,
      assignedTo,
      createdBy: req.user._id,
      attachments: [],
      todoCheckList,
      parentTaskId,
      sortOrder: sortOrder ?? 0,
      sprintId,
      customFields: customFields || {},
      recurrence: recurrence || null,
    });

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "created",
    });

    if (parentTaskId) {
      await rollupParentProgress(parentTaskId);
    }

    await notifyUser({
      orgId: String(req.orgId),
      userId: String(assignedTo),
      type: "task_assigned",
      title: "New task assigned",
      message: `You were assigned "${title}"`,
      link: `/user/task/${task._id}`,
      actorId: String(req.user._id),
      meta: { taskId: String(task._id) },
    });

    const mentioned = await resolveMentions(
      `${title} ${description || ""}`,
      String(req.orgId),
    );
    if (mentioned.length > 0) {
      await notifyMany(mentioned, {
        orgId: String(req.orgId),
        type: "mention",
        title: "You were mentioned in a task",
        message: `${req.user.name || "Someone"} mentioned you in "${title}"`,
        link: `/user/task/${task._id}`,
        actorId: String(req.user._id),
        meta: { taskId: String(task._id) },
      });
    }

    broadcastTaskUpdate(String(req.orgId), {
      taskId: String(task._id),
      action: "created",
      task,
    });

    await runAutomations({ orgId: req.orgId, trigger: "task_created", task });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const prevStatus = task.status;
    const prevAssignee = String(task.assignedTo);
    const tracked: Array<{ field: string; from: unknown; to: unknown }> = [];

    const setIf = (field: string, value: unknown) => {
      if (value === undefined) return;
      const prev = (task as any)[field];
      if (String(prev) !== String(value)) {
        tracked.push({ field, from: prev, to: value });
        (task as any)[field] = value;
      }
    };

    if (req.body.title !== undefined) setIf("title", req.body.title);
    if (req.body.description !== undefined)
      setIf("description", req.body.description);
    if (req.body.priority !== undefined) setIf("priority", req.body.priority);
    if (req.body.status !== undefined) setIf("status", req.body.status);
    if (req.body.dueDate !== undefined) setIf("dueDate", req.body.dueDate);
    if (req.body.startDate !== undefined) setIf("startDate", req.body.startDate);
    if (req.body.assignedTo !== undefined)
      setIf("assignedTo", req.body.assignedTo);
    if (req.body.todoCheckList !== undefined)
      task.todoCheckList = req.body.todoCheckList;
    if (req.body.projectId !== undefined) task.projectId = req.body.projectId;
    if (req.body.goalIds !== undefined) task.goalIds = req.body.goalIds;
    if (req.body.tags !== undefined) task.tags = req.body.tags;
    if (req.body.category !== undefined) setIf("category", req.body.category);
    if (req.body.impactScore !== undefined)
      setIf("impactScore", req.body.impactScore);
    if (req.body.effortHours !== undefined)
      setIf("effortHours", req.body.effortHours);
    if (req.body.collaborators !== undefined)
      task.collaborators = req.body.collaborators;
    if (req.body.blockersText !== undefined)
      task.blockersText = req.body.blockersText;
    if (req.body.progress !== undefined) setIf("progress", req.body.progress);
    if (req.body.sprintId !== undefined) task.sprintId = req.body.sprintId;
    if (req.body.sortOrder !== undefined) task.sortOrder = req.body.sortOrder;
    if (req.body.customFields !== undefined) {
      task.customFields = req.body.customFields;
      tracked.push({ field: "customFields", from: "...", to: "..." });
    }
    if (req.body.recurrence !== undefined) {
      task.recurrence = req.body.recurrence;
      tracked.push({ field: "recurrence", from: "...", to: "..." });
    }

    const updatedTask = await task.save();

    for (const t of tracked) {
      await logTaskActivity({
        orgId: req.orgId,
        taskId: task._id,
        actorId: req.user._id,
        action: "updated",
        field: t.field,
        from: t.from,
        to: t.to,
      });
    }

    if (String(updatedTask.assignedTo) !== prevAssignee) {
      await logTaskActivity({
        orgId: req.orgId,
        taskId: task._id,
        actorId: req.user._id,
        action: "assignee_changed",
        from: prevAssignee,
        to: String(updatedTask.assignedTo),
      });
      await notifyUser({
        orgId: String(req.orgId),
        userId: String(updatedTask.assignedTo),
        type: "task_assigned",
        title: "Task assigned to you",
        message: `You were assigned "${updatedTask.title}"`,
        link: `/user/task/${updatedTask._id}`,
        actorId: String(req.user._id),
        meta: { taskId: String(updatedTask._id) },
      });
    }

    if (req.body.status && req.body.status !== prevStatus) {
      await notifyUser({
        orgId: String(req.orgId),
        userId: String(updatedTask.assignedTo),
        type: "task_status_changed",
        title: "Task status updated",
        message: `"${updatedTask.title}" is now ${updatedTask.status}`,
        link: `/user/task/${updatedTask._id}`,
        actorId: String(req.user._id),
        meta: { taskId: String(updatedTask._id) },
      });
    }

    if (req.body.description !== undefined || req.body.title !== undefined) {
      const mentioned = await resolveMentions(
        `${updatedTask.title} ${updatedTask.description || ""}`,
        String(req.orgId),
      );
      if (mentioned.length > 0) {
        await notifyMany(mentioned, {
          orgId: String(req.orgId),
          type: "mention",
          title: "You were mentioned in a task",
          message: `${req.user.name || "Someone"} mentioned you in "${updatedTask.title}"`,
          link: `/user/task/${updatedTask._id}`,
          actorId: String(req.user._id),
          meta: { taskId: String(updatedTask._id) },
        });
      }
    }

    broadcastTaskUpdate(String(req.orgId), {
      taskId: String(updatedTask._id),
      action: "updated",
      task: updatedTask,
    });

    if (updatedTask.parentTaskId) {
      await rollupParentProgress(String(updatedTask.parentTaskId));
    }

    if (req.orgId) {
      if (req.body.status && req.body.status !== prevStatus) {
        await runAutomations({
          orgId: req.orgId,
          trigger: "task_status_changed",
          task: updatedTask,
        });
      }
      if (updatedTask.status === "Completed" && prevStatus !== "Completed") {
        await runAutomations({
          orgId: req.orgId,
          trigger: "task_completed",
          task: updatedTask,
        });
      }
    }

    res
      .status(200)
      .json({ message: "Task updated successfully", data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const updateTaskStatus = async (
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

    const isAssigned = task.assignedTo.toString() === req.user._id.toString();

    if (!isAssigned && !isOrgElevated(req.membershipRole)) {
      res
        .status(403)
        .json({ message: "You are not authorized to update this task" });
      return;
    }

    const prevStatus = task.status;
    task.status = req.body.status || task.status;
    if (task.status === "Completed") {
      task.todoCheckList.forEach((todo) => (todo.isCompleted = true));
      task.progress = 100;
    }

    const updatedTask = await task.save();

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "status_changed",
      field: "status",
      from: prevStatus,
      to: updatedTask.status,
    });

    if (prevStatus !== updatedTask.status) {
      await notifyUser({
        orgId: String(req.orgId),
        userId: String(updatedTask.assignedTo),
        type: "task_status_changed",
        title: "Task status updated",
        message: `"${updatedTask.title}" is now ${updatedTask.status}`,
        link: `/user/task/${updatedTask._id}`,
        actorId: String(req.user._id),
        meta: { taskId: String(updatedTask._id) },
      });
      broadcastTaskUpdate(String(req.orgId), {
        taskId: String(updatedTask._id),
        action: "status_changed",
        task: updatedTask,
      });
    }

    if (updatedTask.parentTaskId) {
      await rollupParentProgress(String(updatedTask.parentTaskId));
    }

    if (req.orgId) {
      await runAutomations({
        orgId: req.orgId,
        trigger: "task_status_changed",
        task: updatedTask,
      });
      if (updatedTask.status === "Completed") {
        await runAutomations({
          orgId: req.orgId,
          trigger: "task_completed",
          task: updatedTask,
        });
      }
    }

    res
      .status(200)
      .json({ message: "Task status updated successfully", data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const updateTaskAssignee = async (
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

    if (!isOrgElevated(req.membershipRole)) {
      res.status(403).json({ message: "Only admins can reassign tasks" });
      return;
    }

    const { assignedTo } = req.body;
    if (!assignedTo) {
      res.status(400).json({ message: "assignedTo is required" });
      return;
    }

    const prev = String(task.assignedTo);
    task.assignedTo = assignedTo;
    const updatedTask = await task.save();

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "assignee_changed",
      from: prev,
      to: String(assignedTo),
    });

    await notifyUser({
      orgId: String(req.orgId),
      userId: String(assignedTo),
      type: "task_assigned",
      title: "Task assigned to you",
      message: `You were assigned "${task.title}"`,
      link: `/user/task/${task._id}`,
      actorId: String(req.user._id),
      meta: { taskId: String(task._id) },
    });
    broadcastTaskUpdate(String(req.orgId), {
      taskId: String(task._id),
      action: "assignee_changed",
      task: updatedTask,
    });

    res
      .status(200)
      .json({ message: "Task reassigned successfully", data: updatedTask });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const updateTaskCheckList = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { todoCheckList } = req.body;
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const isAssigned = task.assignedTo.toString() === req.user._id.toString();
    if (!isAssigned && !isOrgElevated(req.membershipRole)) {
      res
        .status(403)
        .json({ message: "You are not authorized to update this task" });
      return;
    }

    if (todoCheckList && Array.isArray(todoCheckList)) {
      task.todoCheckList = todoCheckList.map((todo: any) => ({
        text: todo.text || "",
        isCompleted: Boolean(todo.isCompleted || todo.completed || false),
      }));
    }

    const completedCount = task.todoCheckList.filter(
      (todo) => todo.isCompleted === true,
    ).length;
    const totalCount = task.todoCheckList.length;
    task.progress =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (task.progress === 100 && totalCount > 0) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }

    await task.save();
    const updatedTask = await Task.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    }).populate("assignedTo", "name email profileImageUrl");

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "checklist_updated",
    });

    if (task.parentTaskId) {
      await rollupParentProgress(String(task.parentTaskId));
    }

    if (req.orgId) {
      await runAutomations({
        orgId: req.orgId,
        trigger: "task_status_changed",
        task: updatedTask || task,
      });
      if (task.progress === 100 && totalCount > 0) {
        await runAutomations({
          orgId: req.orgId,
          trigger: "task_completed",
          task: updatedTask || task,
        });
      }
    }

    res.status(200).json({
      message: "Task check list updated successfully",
      data: updatedTask,
      progress: task.progress,
      completedCount,
      totalCount,
    });
  } catch (error: any) {
    console.error("UpdateTaskCheckList error:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const parentId = task.parentTaskId ? String(task.parentTaskId) : null;

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "deleted",
    });

    await Task.deleteMany({ parentTaskId: task._id, orgId: req.orgId });
    await task.deleteOne();

    await Dependency.deleteMany({
      orgId: req.orgId,
      $or: [{ fromTaskId: task._id }, { toTaskId: task._id }],
    });

    if (parentId) {
      await rollupParentProgress(parentId);
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const uploadTaskAttachment = async (
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

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const saved = await saveUploadedFile(req.file);
    task.attachments.push({
      url: saved.url,
      name: saved.name,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    } as any);
    await task.save();

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "attachment_added",
      to: saved.name,
    });

    res.status(201).json({
      message: "Attachment uploaded",
      data: task.attachments[task.attachments.length - 1],
      task,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTaskAttachment = async (
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

    const attachment = task.attachments.find(
      (a: any) => String(a._id) === req.params.attachmentId,
    );
    if (!attachment) {
      res.status(404).json({ message: "Attachment not found" });
      return;
    }

    await deleteStoredFile(attachment.url);
    task.attachments = task.attachments.filter(
      (a: any) => String(a._id) !== req.params.attachmentId,
    ) as any;
    await task.save();

    await logTaskActivity({
      orgId: req.orgId,
      taskId: task._id,
      actorId: req.user._id,
      action: "attachment_removed",
      from: attachment.name,
    });

    res.status(200).json({ message: "Attachment deleted", data: task });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const listSubtasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const parent = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!parent) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const subtasks = await Task.find({
      orgId: req.orgId,
      parentTaskId: req.params.id,
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate("assignedTo", "name email profileImageUrl");

    res.status(200).json({ message: "Subtasks fetched", data: subtasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const reorderSubtasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ message: "orderedIds array is required" });
      return;
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        Task.updateOne(
          { _id: id, orgId: req.orgId, parentTaskId: req.params.id },
          { sortOrder: index },
        ),
      ),
    );

    const subtasks = await Task.find({
      orgId: req.orgId,
      parentTaskId: req.params.id,
    }).sort({ sortOrder: 1 });

    res.status(200).json({ message: "Subtasks reordered", data: subtasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const orgId = req.orgId;
    const allTasks = await Task.countDocuments({ orgId });
    const pendingTasks = await Task.countDocuments({
      orgId,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      orgId,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      orgId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const tasksStatus = ["Pending", "In Progress", "In Review", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $match: { orgId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const taskDistribution: Record<string, number> = tasksStatus.reduce(
      (acc: Record<string, number>, status) => {
        const formattedKey = status.toLowerCase().replace(/\s+/g, "_");
        const count =
          taskDistributionRaw.find((item: any) => item._id === status)?.count ||
          0;
        acc[formattedKey] = count;
        return acc;
      },
      {},
    );
    taskDistribution["all"] = allTasks;

    const taskPriority = ["Low", "Medium", "High"];
    const taskPriorityRaw = await Task.aggregate([
      {
        $match: { orgId },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const taskPriorityLevels: Record<string, number> = taskPriority.reduce(
      (acc: Record<string, number>, priority) => {
        acc[priority.toLowerCase().replace(/\s+/g, "_")] =
          taskPriorityRaw.find((item: any) => item._id === priority)?.count ||
          0;
        return acc;
      },
      {},
    );

    const recentTasks = await Task.find({ orgId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    const recentCompletedTasks = await Task.find({ orgId, status: "Completed" })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate assignedTo createdAt");

    res.status(200).json({
      statistics: {
        allTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
      recentCompletedTasks,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getUserDashboardTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const orgId = req.orgId;
    const allTasks = await Task.countDocuments({
      orgId,
      assignedTo: req.user._id,
    });
    const pendingTasks = await Task.countDocuments({
      orgId,
      assignedTo: req.user._id,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      orgId,
      assignedTo: req.user._id,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      orgId,
      assignedTo: req.user._id,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const tasksStatus = ["Pending", "In Progress", "In Review", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $match: { orgId, assignedTo: req.user._id },
      },
      {
        $group: { _id: "$status", count: { $sum: 1 } },
      },
      { $sort: { count: -1 } },
    ]);

    const taskDistribution: Record<string, number> = tasksStatus.reduce(
      (acc: Record<string, number>, status) => {
        const formattedKey = status.toLowerCase().replace(/\s+/g, "_");
        const count =
          taskDistributionRaw.find((item: any) => item._id === status)?.count ||
          0;
        acc[formattedKey] = count;
        return acc;
      },
      {},
    );
    taskDistribution["all"] = allTasks;

    const taskPriority = ["Low", "Medium", "High"];
    const taskPriorityRaw = await Task.aggregate([
      {
        $match: { orgId, assignedTo: req.user._id },
      },
      {
        $group: { _id: "$priority", count: { $sum: 1 } },
      },
      { $sort: { count: -1 } },
    ]);

    const taskPriorityLevels: Record<string, number> = taskPriority.reduce(
      (acc: Record<string, number>, priority) => {
        acc[priority.toLowerCase().replace(/\s+/g, "_")] =
          taskPriorityRaw.find((item: any) => item._id === priority)?.count ||
          0;
        return acc;
      },
      {},
    );

    const recentTasks = await Task.find({ orgId, assignedTo: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    const recentCompletedTasks = await Task.find({
      orgId,
      assignedTo: req.user._id,
      status: "Completed",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate assignedTo createdAt");

    res.status(200).json({
      statistics: {
        allTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
      recentCompletedTasks,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export {
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
};
