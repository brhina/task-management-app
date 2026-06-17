import { Response } from "express";
import Task from "../models/Task.js";
import User from "../models/User.js";
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

    const tasks = await Task.find({ orgId: req.orgId }).populate(
      "assignedTo",
      "name email",
    );

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");
    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Status", key: "status", width: 20 },
      { header: "Priority", key: "priority", width: 20 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Updated At", key: "updatedAt", width: 20 },
    ];
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
        dueDate: task.dueDate,
        assignedTo: assignedTo,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      });
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
        tasksCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      };
    });

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
            case "Completed":
              userTasksMap[user._id].completedTasks++;
              break;
          }
        }
      }
    });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("User Task Report");
    worksheet.columns = [
      { header: "User Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 40 },
      { header: "Total Assigned Tasks", key: "tasksCount", width: 20 },
      { header: "Pending Tasks", key: "pendingTasks", width: 20 },
      { header: "In Progress Tasks", key: "inProgressTasks", width: 20 },
      { header: "Completed Tasks", key: "completedTasks", width: 20 },
      { header: "Overdue Tasks", key: "overdueTasks", width: 20 },
    ];

    Object.values(userTasksMap).forEach((user) => {
      worksheet.addRow(user);
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

export { exportTasksReport, exportUsersReport };
