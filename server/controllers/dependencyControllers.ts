import { Response } from "express";
import Dependency from "../models/Dependency.js";
import Task from "../models/Task.js";
import { analyzeDependencies } from "../services/dependencyEngine.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const listDependencies = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }
    const { taskId } = req.query;
    const filter: any = { orgId: req.orgId };
    if (taskId) {
      filter.$or = [{ fromTaskId: taskId }, { toTaskId: taskId }];
    }

    const deps = await Dependency.find(filter)
      .sort({ createdAt: -1 })
      .populate("fromTaskId", "title status priority dueDate")
      .populate("toTaskId", "title status priority dueDate");

    res
      .status(200)
      .json({ message: "Dependencies fetched successfully", data: deps });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createDependency = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { fromTaskId, toTaskId, type, lagHours } = req.body;
    if (!fromTaskId || !toTaskId) {
      res.status(400).json({ message: "fromTaskId and toTaskId are required" });
      return;
    }
    if (String(fromTaskId) === String(toTaskId)) {
      res.status(400).json({ message: "A task cannot depend on itself" });
      return;
    }

    const [fromTask, toTask] = await Promise.all([
      Task.findOne({ _id: fromTaskId, orgId: req.orgId }).select("_id"),
      Task.findOne({ _id: toTaskId, orgId: req.orgId }).select("_id"),
    ]);
    if (!fromTask || !toTask) {
      res
        .status(404)
        .json({ message: "Both tasks must exist in the same organization" });
      return;
    }

    const dep = await Dependency.create({
      orgId: req.orgId,
      fromTaskId,
      toTaskId,
      type: type || "FS",
      lagHours: lagHours || 0,
      status: "Active",
    });

    res
      .status(201)
      .json({ message: "Dependency created successfully", data: dep });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDependency = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const dep = await Dependency.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });
    if (!dep) {
      res.status(404).json({ message: "Dependency not found" });
      return;
    }

    await dep.deleteOne();
    res.status(200).json({ message: "Dependency deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDependencyAnalysis = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const analysis = await analyzeDependencies({ orgId: req.orgId });
    res
      .status(200)
      .json({ message: "Dependency analysis computed", data: analysis });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
