import { Response } from "express";
import Goal from "../models/Goal.js";
import GoalLink from "../models/GoalLink.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const listGoals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const goals = await Goal.find({ orgId: req.orgId }).sort({ createdAt: -1 });
        res.status(200).json({ message: "Goals fetched successfully", data: goals });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getGoalById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const goal = await Goal.findOne({ _id: req.params.id, orgId: req.orgId });
        if (!goal) {
            res.status(404).json({ message: "Goal not found" });
            return;
        }

        const links = await GoalLink.find({ orgId: req.orgId, goalId: goal._id });
        const projectIds = links.filter(l => l.projectId).map(l => l.projectId);
        const taskIds = links.filter(l => l.taskId).map(l => l.taskId);

        const linkedProjects = projectIds.length ? await Project.find({ orgId: req.orgId, _id: { $in: projectIds } }).select("name status") : [];
        const linkedTasks = taskIds.length ? await Task.find({ orgId: req.orgId, _id: { $in: taskIds } }).select("title status priority dueDate") : [];

        res.status(200).json({ message: "Goal fetched successfully", data: { goal, linkedProjects, linkedTasks } });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const { title, objective, metric, targetValue, currentValue, ownerId, timeframe, startDate, endDate } = req.body;
        if (!title || !String(title).trim()) {
            res.status(400).json({ message: "Goal title is required" });
            return;
        }

        const goal = await Goal.create({
            orgId: req.orgId,
            title: String(title).trim(),
            objective: objective ? String(objective).trim() : undefined,
            metric: metric ? String(metric).trim() : undefined,
            targetValue,
            currentValue,
            ownerId: ownerId || req.user._id,
            timeframe,
            startDate,
            endDate,
        });

        res.status(201).json({ message: "Goal created successfully", data: goal });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const goal = await Goal.findOne({ _id: req.params.id, orgId: req.orgId });
        if (!goal) {
            res.status(404).json({ message: "Goal not found" });
            return;
        }

        goal.title = req.body.title ?? goal.title;
        goal.objective = req.body.objective ?? goal.objective;
        goal.metric = req.body.metric ?? goal.metric;
        goal.targetValue = req.body.targetValue ?? goal.targetValue;
        goal.currentValue = req.body.currentValue ?? goal.currentValue;
        goal.ownerId = req.body.ownerId ?? goal.ownerId;
        goal.timeframe = req.body.timeframe ?? goal.timeframe;
        goal.startDate = req.body.startDate ?? goal.startDate;
        goal.endDate = req.body.endDate ?? goal.endDate;

        const updated = await goal.save();
        res.status(200).json({ message: "Goal updated successfully", data: updated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGoal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const goal = await Goal.findOne({ _id: req.params.id, orgId: req.orgId });
        if (!goal) {
            res.status(404).json({ message: "Goal not found" });
            return;
        }

        await GoalLink.deleteMany({ orgId: req.orgId, goalId: goal._id });
        await Task.updateMany({ orgId: req.orgId }, { $pull: { goalIds: goal._id } });
        await goal.deleteOne();

        res.status(200).json({ message: "Goal deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const linkGoalToProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const { projectId } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, orgId: req.orgId });
        if (!goal) {
            res.status(404).json({ message: "Goal not found" });
            return;
        }
        const project = await Project.findOne({ _id: projectId, orgId: req.orgId });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const link = await GoalLink.findOneAndUpdate(
            { orgId: req.orgId, goalId: goal._id, projectId: project._id, linkType: "GoalToProject" },
            { $setOnInsert: { orgId: req.orgId, goalId: goal._id, projectId: project._id, linkType: "GoalToProject" } },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Goal linked to project", data: link });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const unlinkGoalFromProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: "Organization context is required" });
            return;
        }

        const { projectId } = req.body;
        await GoalLink.deleteOne({ orgId: req.orgId, goalId: req.params.id, projectId, linkType: "GoalToProject" });
        res.status(200).json({ message: "Goal unlinked from project" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

