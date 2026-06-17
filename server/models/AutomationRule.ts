import mongoose from "mongoose";

export type AutomationTrigger =
  | "task_created"
  | "task_completed"
  | "task_status_changed"
  | "daily_summary";

export interface IAutomationRule {
  orgId: mongoose.Types.ObjectId;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions?: Record<string, any>;
  actions: Array<Record<string, any>>;
}

export interface IAutomationRuleDocument
  extends IAutomationRule, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const automationRuleSchema = new mongoose.Schema<IAutomationRuleDocument>(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    trigger: {
      type: String,
      enum: [
        "task_created",
        "task_completed",
        "task_status_changed",
        "daily_summary",
      ],
      required: true,
      index: true,
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    actions: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
      default: [],
    },
  },
  { timestamps: true },
);

automationRuleSchema.index({ orgId: 1, trigger: 1, enabled: 1 });

const AutomationRule = mongoose.model<IAutomationRuleDocument>(
  "AutomationRule",
  automationRuleSchema,
);

export default AutomationRule;
