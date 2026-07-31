import { z } from "zod";
import { type Request, type Response, type NextFunction } from "express";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  profileImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  adminInviteToken: z.string().optional(),
  orgId: z.string().optional(),
  orgInviteToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  profileImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(2000),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  dueDate: z.string().nonempty("Due date is required"),
  startDate: z.string().optional(),
  assignedTo: z.string().nonempty("Assignee is required"),
  todoCheckList: z
    .array(
      z.object({
        text: z.string(),
        isCompleted: z.boolean().optional(),
      }),
    )
    .optional(),
  projectId: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  impactScore: z.number().min(0).max(10).optional(),
  effortHours: z.number().min(0).optional(),
  collaborators: z.array(z.string()).optional(),
  blockersText: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
  sortOrder: z.number().optional(),
  sprintId: z.string().optional().nullable(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      interval: z.number().min(1).optional(),
      nextRunAt: z.string(),
      endDate: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  status: z.enum(["Pending", "In Progress", "In Review", "Completed"]).optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional().nullable(),
  assignedTo: z.string().optional(),
  todoCheckList: z
    .array(
      z.object({
        text: z.string(),
        isCompleted: z.boolean().optional(),
      }),
    )
    .optional(),
  projectId: z.string().nullable().optional(),
  goalIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  impactScore: z.number().min(0).max(10).optional(),
  effortHours: z.number().min(0).optional(),
  collaborators: z.array(z.string()).optional(),
  blockersText: z.array(z.string()).optional(),
  progress: z.number().min(0).max(100).optional(),
  parentTaskId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  sprintId: z.string().optional().nullable(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      interval: z.number().min(1).optional(),
      nextRunAt: z.string(),
      endDate: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["Pending", "In Progress", "In Review", "Completed"]),
});

export const updateTaskChecklistSchema = z.object({
  todoCheckList: z.array(
    z.object({
      text: z.string(),
      isCompleted: z.boolean(),
    }),
  ),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  status: z
    .enum(["Planned", "Active", "Paused", "Completed", "Archived"])
    .optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  ownerId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z
    .enum(["Planned", "Active", "Paused", "Completed", "Archived"])
    .optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  ownerId: z.string().optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required").max(200),
  objective: z.string().max(2000).optional(),
  metric: z.string().max(100).optional(),
  targetValue: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  ownerId: z.string().optional(),
  timeframe: z
    .enum(["Weekly", "Monthly", "Quarterly", "Yearly", "Custom"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  plan: z.enum(["Free", "Pro", "Enterprise"]).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["OrgAdmin", "OrgMember"]).optional(),
});

export const createDependencySchema = z.object({
  fromTaskId: z.string().nonempty("Prerequisite task is required"),
  toTaskId: z.string().nonempty("Dependent task is required"),
  type: z.enum(["FS", "SS", "FF"]).optional(),
  lagHours: z.number().min(0).optional(),
});

export const createAutomationRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(200),
  enabled: z.boolean().optional(),
  trigger: z.enum([
    "task_created",
    "task_completed",
    "task_status_changed",
    "daily_summary",
  ]),
  conditions: z.record(z.unknown()).optional(),
  actions: z.array(z.record(z.unknown())).min(1, "At least one action required"),
});

function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      res.status(400).json({
        message: "Validation failed",
        errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export { validate };
