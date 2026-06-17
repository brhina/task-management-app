import { Response } from "express";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Goal from "../models/Goal.js";
import GoalLink from "../models/GoalLink.js";
import OrgMembership from "../models/OrgMembership.js";
import exceljs from "exceljs";
import { AuthRequest } from "../middleware/authMiddleware.js";

const exportTasksReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const { startDate, endDate, status, priority } = req.query;
    const filter: any = { orgId: req.orgId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter).populate("assignedTo", "name email");

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");

    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Status", key: "status", width: 20 },
      { header: "Priority", key: "priority", width: 20 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 25 },
      { header: "Progress", key: "progress", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };

    tasks.forEach((task: any) => {
      const assignedTo = task.assignedTo
        ? `${task.assignedTo.name} (${task.assignedTo.email})`
        : "Unassigned";

      worksheet.addRow({
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : "N/A",
        assignedTo,
        progress: `${task.progress || 0}%`,
        createdAt: new Date(task.createdAt).toLocaleDateString(),
        updatedAt: new Date(task.updatedAt).toLocaleDateString(),
      });
    });

    // Add summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 20 },
    ];

    const statusCounts = tasks.reduce(
      (acc: any, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRow({ metric: "Total Tasks", value: tasks.length });
    summarySheet.addRow({
      metric: "Pending",
      value: statusCounts["Pending"] || 0,
    });
    summarySheet.addRow({
      metric: "In Progress",
      value: statusCounts["In Progress"] || 0,
    });
    summarySheet.addRow({
      metric: "In Review",
      value: statusCounts["In Review"] || 0,
    });
    summarySheet.addRow({
      metric: "Completed",
      value: statusCounts["Completed"] || 0,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tasks_report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const exportUsersReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    });
    const userIds = memberships.map((m: any) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email _id createdAt",
    );
    const userTasks = await Task.find({ orgId: req.orgId }).populate(
      "assignedTo",
      "name email _id createdAt",
    );

    const userTasksMap: Record<string, any> = {};
    users.forEach((user: any) => {
      userTasksMap[user._id] = {
        name: user.name,
        email: user.email,
        role:
          memberships.find((m) => m.userId.toString() === user._id.toString())
            ?.role || "OrgMember",
        tasksCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        inReviewTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
      };
    });

    const now = new Date();
    userTasks.forEach((task: any) => {
      if (task.assignedTo) {
        const user = task.assignedTo;
        if (userTasksMap[user._id]) {
          userTasksMap[user._id].tasksCount++;
          switch (task.status) {
            case "Pending":
              userTasksMap[user._id].pendingTasks++;
              break;
            case "In Progress":
              userTasksMap[user._id].inProgressTasks++;
              break;
            case "In Review":
              userTasksMap[user._id].inReviewTasks++;
              break;
            case "Completed":
              userTasksMap[user._id].completedTasks++;
              break;
          }
          if (
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.status !== "Completed"
          ) {
            userTasksMap[user._id].overdueTasks++;
          }
        }
      }
    });

    // Calculate completion rates
    Object.values(userTasksMap).forEach((user: any) => {
      user.completionRate =
        user.tasksCount > 0
          ? Math.round((user.completedTasks / user.tasksCount) * 100)
          : 0;
    });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("User Task Report");

    worksheet.columns = [
      { header: "User Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 40 },
      { header: "Role", key: "role", width: 15 },
      { header: "Total Tasks", key: "tasksCount", width: 15 },
      { header: "Pending", key: "pendingTasks", width: 15 },
      { header: "In Progress", key: "inProgressTasks", width: 15 },
      { header: "In Review", key: "inReviewTasks", width: 15 },
      { header: "Completed", key: "completedTasks", width: 15 },
      { header: "Overdue", key: "overdueTasks", width: 15 },
      { header: "Completion Rate", key: "completionRate", width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };

    Object.values(userTasksMap).forEach((user: any) => {
      worksheet.addRow({
        ...user,
        completionRate: `${user.completionRate}%`,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=user_task_report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const exportProjectsReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const projects = await Project.find({ orgId: req.orgId });
    const tasks = await Task.find({ orgId: req.orgId });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Projects Report");

    worksheet.columns = [
      { header: "Project ID", key: "_id", width: 25 },
      { header: "Name", key: "name", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Status", key: "status", width: 20 },
      { header: "Total Tasks", key: "totalTasks", width: 15 },
      { header: "Completed Tasks", key: "completedTasks", width: 18 },
      { header: "Progress", key: "progress", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8B5CF6" },
    };

    for (const project of projects) {
      const projectId = (project._id as any).toString();
      const projectTasks = tasks.filter(
        (t) => t.projectId?.toString() === projectId,
      );
      const completedTasks = projectTasks.filter(
        (t) => t.status === "Completed",
      ).length;
      const progress =
        projectTasks.length > 0
          ? Math.round((completedTasks / projectTasks.length) * 100)
          : 0;

      worksheet.addRow({
        _id: projectId,
        name: project.name,
        description: project.description || "N/A",
        status: (project as any).status || "Active",
        totalTasks: projectTasks.length,
        completedTasks,
        progress: `${progress}%`,
        createdAt: new Date(project.createdAt).toLocaleDateString(),
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=projects_report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const exportGoalsReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const goals = await Goal.find({ orgId: req.orgId });
    const goalLinks = await GoalLink.find({
      orgId: req.orgId,
      linkType: "GoalToProject",
    }).populate("projectId", "name");
    const projects = await Project.find({ orgId: req.orgId });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Goals Report");

    worksheet.columns = [
      { header: "Goal ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Objective", key: "objective", width: 50 },
      { header: "Metric", key: "metric", width: 25 },
      { header: "Target Value", key: "targetValue", width: 15 },
      { header: "Current Value", key: "currentValue", width: 15 },
      { header: "Timeframe", key: "timeframe", width: 15 },
      { header: "Start Date", key: "startDate", width: 20 },
      { header: "End Date", key: "endDate", width: 20 },
      { header: "Linked Projects", key: "linkedProjects", width: 30 },
      { header: "Progress", key: "progress", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF59E0B" },
    };

    goals.forEach((goal: any) => {
      const goalId = goal._id.toString();
      const linkedProjectIds = goalLinks
        .filter((link) => link.goalId.toString() === goalId)
        .map((link) => link.projectId);
      const linkedProjectNames =
        linkedProjectIds.length > 0
          ? linkedProjectIds.map((p: any) => p?.name || "Unknown").join(", ")
          : "None";

      const progress =
        goal.targetValue && goal.targetValue > 0
          ? Math.round(((goal.currentValue || 0) / goal.targetValue) * 100)
          : 0;

      worksheet.addRow({
        _id: goalId,
        title: goal.title,
        objective: goal.objective || "N/A",
        metric: goal.metric || "N/A",
        targetValue: goal.targetValue ?? "N/A",
        currentValue: goal.currentValue ?? 0,
        timeframe: goal.timeframe || "Quarterly",
        startDate: goal.startDate
          ? new Date(goal.startDate).toLocaleDateString()
          : "N/A",
        endDate: goal.endDate
          ? new Date(goal.endDate).toLocaleDateString()
          : "N/A",
        linkedProjects: linkedProjectNames,
        progress: `${progress}%`,
        createdAt: new Date(goal.createdAt).toLocaleDateString(),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=goals_report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getReportSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.orgId) {
      res.status(400).json({ message: "Organization context is required" });
      return;
    }

    const tasks = await Task.find({ orgId: req.orgId });
    const projects = await Project.find({ orgId: req.orgId });
    const goals = await Goal.find({ orgId: req.orgId });
    const memberships = await OrgMembership.find({
      orgId: req.orgId,
      status: "Active",
    });

    const now = new Date();
    const tasksByStatus = {
      pending: tasks.filter((t) => t.status === "Pending").length,
      inProgress: tasks.filter((t) => t.status === "In Progress").length,
      inReview: tasks.filter((t) => t.status === "In Review").length,
      completed: tasks.filter((t) => t.status === "Completed").length,
    };

    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed",
    ).length;

    const completionRate =
      tasks.length > 0
        ? Math.round((tasksByStatus.completed / tasks.length) * 100)
        : 0;

    res.status(200).json({
      totalTasks: tasks.length,
      totalProjects: projects.length,
      totalGoals: goals.length,
      totalMembers: memberships.length,
      tasksByStatus,
      overdueTasks,
      completionRate,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export {
  exportTasksReport,
  exportUsersReport,
  exportProjectsReport,
  exportGoalsReport,
  getReportSummary,
};
