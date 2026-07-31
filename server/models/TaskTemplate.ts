import mongoose from "mongoose";

export interface ITemplateTodo {
  text: string;
  isCompleted: boolean;
}

export interface ITaskTemplate {
  orgId: mongoose.Types.ObjectId;
  name: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  tags?: string[];
  category?: string;
  impactScore?: number;
  effortHours?: number;
  checklist: ITemplateTodo[];
  createdBy: mongoose.Types.ObjectId;
}

export interface ITaskTemplateDocument extends ITaskTemplate, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const templateTodoSchema = new mongoose.Schema<ITemplateTodo>(
  {
    text: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const taskTemplateSchema = new mongoose.Schema<ITaskTemplateDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    tags: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    impactScore: { type: Number, min: 0, max: 10, default: 5 },
    effortHours: { type: Number, min: 0, default: 1 },
    checklist: [templateTodoSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

taskTemplateSchema.index({ orgId: 1, name: 1 });

const TaskTemplate = mongoose.model<ITaskTemplateDocument>(
  "TaskTemplate",
  taskTemplateSchema,
);
export default TaskTemplate;
