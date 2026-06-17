import { Response } from 'express';
import Task from '../models/Task.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';
import { runAutomations } from '../services/automationRunner.js';

const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status, projectId } = req.query;
        let filter: any = {};

        if (status) {
            filter.status = status;
        }

        if (projectId) {
            filter.projectId = projectId;
        }

        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        filter.orgId = new mongoose.Types.ObjectId(req.orgId);

        let tasks;
        if (req.membershipRole === 'OrgAdmin') {
            tasks = await Task.find(filter).populate('assignedTo', 'name email profileImageUrl');
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate('assignedTo', 'name email profileImageUrl');
        }

        tasks = await Promise.all(
            tasks.map(async (task) => {
                const completedCount = task.todoCheckList.filter(todo => todo.isCompleted === true).length;
                const totalCount = task.todoCheckList.length;
                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                return { 
                    ...task.toObject(), 
                    completedCount,
                    totalCount,
                    progress
                };
            })
        );

        const allTasks = await Task.countDocuments(
            req.membershipRole === 'OrgAdmin' ? { orgId: filter.orgId } : { ...filter, assignedTo: req.user._id }
        );

        const pendingTasks = await Task.countDocuments({
            ...filter, 
            status: 'Pending',
            ...(req.membershipRole !== 'OrgAdmin' && { assignedTo: req.user._id })
        });

        const inProgressTasks = await Task.countDocuments({
            ...filter, 
            status: 'In Progress',
            ...(req.membershipRole !== 'OrgAdmin' && { assignedTo: req.user._id })
        });

        const inReviewTasks = await Task.countDocuments({
            ...filter, 
            status: 'In Review',
            ...(req.membershipRole !== 'OrgAdmin' && { assignedTo: req.user._id })
        });

        const completedTasks = await Task.countDocuments({
            ...filter,
            status: 'Completed',
            ...(req.membershipRole !== 'OrgAdmin' && { assignedTo: req.user._id })
        });

        res.status(200).json({ message: 'Tasks fetched successfully', data: {
            tasks,
            statusSummary: {
                all: allTasks,
                pending: pendingTasks,
                inProgress: inProgressTasks,
                inReview: inReviewTasks,
                completed: completedTasks
            }
        } });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId }).populate('assignedTo', 'name email profileImageUrl');

        if (!task) { 
            res.status(404).json({ message: 'Task not found' }); 
            return; 
        }

        res.status(200).json({ message: 'Task fetched successfully', data: task });
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
            assignedTo,
            attachements,
            todoCheckList,
            projectId,
            goalIds,
            tags,
            category,
            impactScore,
            effortHours,
            collaborators,
            blockersText,
        } = req.body;

        if (!assignedTo) {
            res.status(400).json({ message: 'Assigned to is required' });
            return;
        }
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.create({
            orgId: req.orgId,
            title,
            description,
            priority,
            dueDate,
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
            attachements,
            todoCheckList
        });

        await runAutomations({ orgId: req.orgId, trigger: 'task_created', task });

        res.status(201).json({ message: 'Task created successfully', task });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

        if (!task) { 
            res.status(404).json({ message: 'Task not found' }); 
            return; 
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.assignedTo = req.body.assignedTo || task.assignedTo;
        task.attachments = req.body.attachements || task.attachments;
        task.todoCheckList = req.body.todoCheckList || task.todoCheckList;
        task.projectId = req.body.projectId ?? task.projectId;
        task.goalIds = req.body.goalIds ?? task.goalIds;
        task.tags = req.body.tags ?? task.tags;
        task.category = req.body.category ?? task.category;
        task.impactScore = req.body.impactScore ?? task.impactScore;
        task.effortHours = req.body.effortHours ?? task.effortHours;
        task.collaborators = req.body.collaborators ?? task.collaborators;
        task.blockersText = req.body.blockersText ?? task.blockersText;

        if (req.body.assignedTo) {
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();
        res.status(200).json({ message: 'Task updated successfully', data: updatedTask });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

        if (!task) { 
            res.status(404).json({ message: 'Task not found' }); 
            return; 
        }

        const isAssigned = task.assignedTo.toString() === req.user._id.toString();

        if (!isAssigned && req.membershipRole !== 'OrgAdmin') {
            res.status(403).json({ message: 'You are not authorized to update this task' });
            return;
        }

        task.status = req.body.status || task.status;
        if (task.status === 'Completed') {
            task.todoCheckList.forEach(todo => todo.isCompleted = true);
            task.progress = 100;
        }

        const updatedTask = await task.save();

        if (req.orgId) {
            await runAutomations({ orgId: req.orgId, trigger: 'task_status_changed', task: updatedTask });
            if (updatedTask.status === 'Completed') {
                await runAutomations({ orgId: req.orgId, trigger: 'task_completed', task: updatedTask });
            }
        }

        res.status(200).json({ message: 'Task status updated successfully', data: updatedTask });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskAssignee = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        if (req.membershipRole !== 'OrgAdmin') {
            res.status(403).json({ message: 'Only admins can reassign tasks' });
            return;
        }

        const { assignedTo } = req.body;
        if (!assignedTo) {
            res.status(400).json({ message: 'assignedTo is required' });
            return;
        }

        task.assignedTo = assignedTo;
        const updatedTask = await task.save();

        res.status(200).json({ message: 'Task reassigned successfully', data: updatedTask });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskCheckList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { todoCheckList } = req.body;
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        const isAssigned = task.assignedTo.toString() === req.user._id.toString();
        if (!isAssigned && req.membershipRole !== 'OrgAdmin') {
            res.status(403).json({ message: 'You are not authorized to update this task' });
            return;
        }
        
        if (todoCheckList && Array.isArray(todoCheckList)) {
            task.todoCheckList = todoCheckList.map((todo: any) => ({
                text: todo.text || '',
                isCompleted: Boolean(todo.isCompleted || todo.completed || false)
            }));
        }
        
        const completedCount = task.todoCheckList.filter(todo => todo.isCompleted === true).length;
        const totalCount = task.todoCheckList.length;
        task.progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        if (task.progress === 100 && totalCount > 0) {
            task.status = 'Completed';
        } else if (task.progress > 0) {
            task.status = 'In Progress';
        } else {
            task.status = 'Pending';
        }

        await task.save();
        const updatedTask = await Task.findOne({ _id: req.params.id, orgId: req.orgId }).populate('assignedTo', 'name email profileImageUrl');
        res.status(200).json({ 
            message: 'Task check list updated successfully', 
            data: updatedTask,
            progress: task.progress,
            completedCount,
            totalCount
        });
    } catch (error: any) {
        console.error('UpdateTaskCheckList error:', error);
        res.status(500).json({ message: error.message });
    }
};

const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });

        if (!task) { 
            res.status(404).json({ message: 'Task not found' }); 
            return; 
        }

        await task.deleteOne();
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const getDashboardTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const orgId = req.orgId;
        const allTasks = await Task.countDocuments({ orgId });
        const pendingTasks = await Task.countDocuments({ orgId, status: 'Pending' });
        const completedTasks = await Task.countDocuments({ orgId, status: 'Completed' });
        const overdueTasks = await Task.countDocuments({ 
            orgId,
            status: { $ne: 'Completed' },
            dueDate: { $lt: new Date() }
        });

        const tasksStatus = ['Pending', 'In Progress', 'In Review', 'Completed'];
        const taskDistributionRaw = await Task.aggregate([
            {
                $match: { orgId }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const taskDistribution: Record<string, number> = tasksStatus.reduce((acc: Record<string, number>, status) => {
            const formattedKey = status.toLowerCase().replace(/\s+/g, '_');
            const count = taskDistributionRaw.find((item: any) => item._id === status)?.count || 0;
            acc[formattedKey] = count;
            return acc;
        }, {});
        taskDistribution['all'] = allTasks;

        const taskPriority = ['Low', 'Medium', 'High'];
        const taskPriorityRaw = await Task.aggregate([
            {
                $match: { orgId }
            },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const taskPriorityLevels: Record<string, number> = taskPriority.reduce((acc: Record<string, number>, priority) => {
            acc[priority.toLowerCase().replace(/\s+/g, '_')] = taskPriorityRaw.find((item: any) => item._id === priority)?.count || 0;
            return acc;
        }, {});
            
        const recentTasks = await Task.find({ orgId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title status priority dueDate createdAt');
        
        const recentCompletedTasks = await Task.find({ orgId, status: 'Completed' })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title status priority dueDate assignedTo createdAt');
        
        res.status(200).json({
            statistics: {
                allTasks,
                pendingTasks,
                completedTasks,
                overdueTasks
            },
            charts: {
                taskDistribution,
                taskPriorityLevels
            },
            recentTasks,
            recentCompletedTasks
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const getUserDashboardTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.orgId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const orgId = req.orgId;
        const allTasks = await Task.countDocuments({ orgId, assignedTo: req.user._id });
        const pendingTasks = await Task.countDocuments({ orgId, assignedTo: req.user._id, status: 'Pending' });
        const completedTasks = await Task.countDocuments({ orgId, assignedTo: req.user._id, status: 'Completed' });
        const overdueTasks = await Task.countDocuments({ 
            orgId,
            assignedTo: req.user._id, 
            status: { $ne: 'Completed' }, 
            dueDate: { $lt: new Date() } 
        });

        const tasksStatus = ['Pending', 'In Progress', 'In Review', 'Completed'];
        const taskDistributionRaw = await Task.aggregate([
            {
                $match: { orgId, assignedTo: req.user._id }
            },
            {
                $group: { _id: '$status', count: { $sum: 1 } }
            },
            { $sort: { count: -1 } }
        ]);

        const taskDistribution: Record<string, number> = tasksStatus.reduce((acc: Record<string, number>, status) => {
            const formattedKey = status.toLowerCase().replace(/\s+/g, '_');
            const count = taskDistributionRaw.find((item: any) => item._id === status)?.count || 0;
            acc[formattedKey] = count;
            return acc;
        }, {});
        taskDistribution['all'] = allTasks;

        const taskPriority = ['Low', 'Medium', 'High'];
        const taskPriorityRaw = await Task.aggregate([
            {
                $match: { orgId, assignedTo: req.user._id }
            },
            {
                $group: { _id: '$priority', count: { $sum: 1 } }
            },
            { $sort: { count: -1 } }
        ]);

        const taskPriorityLevels: Record<string, number> = taskPriority.reduce((acc: Record<string, number>, priority) => {
            acc[priority.toLowerCase().replace(/\s+/g, '_')] = taskPriorityRaw.find((item: any) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        const recentTasks = await Task.find({ orgId, assignedTo: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title status priority dueDate createdAt');

        const recentCompletedTasks = await Task.find({ orgId, assignedTo: req.user._id, status: 'Completed' })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('title status priority dueDate assignedTo createdAt');

        res.status(200).json({
            statistics: {
                allTasks,
                pendingTasks,
                completedTasks,
                overdueTasks
            },
            charts: {
                taskDistribution,
                taskPriorityLevels
            },
            recentTasks,
            recentCompletedTasks
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
    deleteTask
};
