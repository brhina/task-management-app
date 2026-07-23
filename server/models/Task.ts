import mongoose from "mongoose";

export interface ITodo {
  text: string;
  isCompleted: boolean;
}

export interface ITaskAttachment {
  _id?: mongoose.Types.ObjectId;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface ITaskRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  nextRunAt: Date;
  endDate?: Date;
  templateTaskId?: mongoose.Types.ObjectId;
}

export interface ITask {
  orgId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "In Review" | "Completed";
  dueDate: Date;
  startDate?: Date;
  projectId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  goalIds?: mongoose.Types.ObjectId[];
  tags?: string[];
  category?: string;
  impactScore?: number;
  effortHours?: number;
  collaborators?: mongoose.Types.ObjectId[];
  blockersText?: string[];
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  attachments: ITaskAttachment[];
  todoCheckList: ITodo[];
  progress: number;
  parentTaskId?: mongoose.Types.ObjectId;
  sortOrder?: number;
  sprintId?: mongoose.Types.ObjectId;
  customFields?: Map<string, unknown> | Record<string, unknown>;
  recurrence?: ITaskRecurrence | null;
}

export interface ITaskDocument extends ITask, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const todoSchema = new mongoose.Schema<ITodo>({
  text: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const attachmentSchema = new mongoose.Schema<ITaskAttachment>({
  url: { type: String, required: true },
  name: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedAt: { type: Date, default: Date.now },
});

const recurrenceSchema = new mongoose.Schema<ITaskRecurrence>(
  {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    interval: { type: Number, min: 1, default: 1 },
    nextRunAt: { type: Date, required: true },
    endDate: { type: Date },
    templateTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema<ITaskDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "In Review", "Completed"],
      default: "Pending",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: false,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: false,
      index: true,
    },
    goalIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Goal",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      trim: true,
    },
    impactScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
    },
    effortHours: {
      type: Number,
      min: 0,
      default: 1,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockersText: [
      {
        type: String,
        trim: true,
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [attachmentSchema],
    todoCheckList: [todoSchema],
    progress: {
      type: Number,
      default: 0,
    },
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      index: true,
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recurrence: {
      type: recurrenceSchema,
      default: null,
    },
  },
  { timestamps: true },
);

taskSchema.index({ title: "text", description: "text", tags: "text", category: "text" });
taskSchema.index({ orgId: 1, "recurrence.nextRunAt": 1 });
taskSchema.index({ orgId: 1, parentTaskId: 1, sortOrder: 1 });

const Task = mongoose.model<ITaskDocument>("Task", taskSchema);

export default Task;
