import mongoose from "mongoose";
import AutomationRule, {
  type AutomationTrigger,
} from "../models/AutomationRule.js";
import Task from "../models/Task.js";
import { buildOrgWorkosSummary } from "./workosSummary.js";
import InsightSnapshot from "../models/InsightSnapshot.js";

function matchesConditions(rule: any, task: any): boolean {
  const c = rule.conditions || {};
  if (c.status && task.status !== c.status) return false;
  if (c.priority && task.priority !== c.priority) return false;
  if (c.projectId && String(task.projectId || "") !== String(c.projectId))
    return false;
  if (c.tagIncludes) {
    const tags: string[] = task.tags || [];
    if (!tags.includes(String(c.tagIncludes))) return false;
  }
  return true;
}

async function runActions(params: {
  orgId: mongoose.Types.ObjectId;
  trigger: AutomationTrigger;
  task?: any;
  rule: any;
}): Promise<void> {
  for (const action of params.rule.actions || []) {
    const type = action.type;
    if (type === "notify") {
      // Placeholder: enterprise integrations can be added later (email/slack/webhook).
      console.log("[Automation notify]", {
        orgId: String(params.orgId),
        trigger: params.trigger,
        rule: params.rule.name,
        message: action.message,
        taskId: params.task?._id ? String(params.task._id) : undefined,
      });
      continue;
    }

    if (type === "create_dependent_task" && params.task) {
      const titleTemplate = String(action.title || "Follow-up: {{title}}");
      const descriptionTemplate = String(
        action.description || "Auto-created from {{title}} completion.",
      );
      const title = titleTemplate.replace(/\{\{title\}\}/g, params.task.title);
      const description = descriptionTemplate.replace(
        /\{\{title\}\}/g,
        params.task.title,
      );
      const assignedTo = action.assignedTo || params.task.assignedTo;

      await Task.create({
        orgId: params.orgId,
        title,
        description,
        priority: action.priority || "Medium",
        status: "Pending",
        dueDate:
          action.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTo,
        createdBy: params.task.createdBy,
        attachments: [],
        todoCheckList: [],
        progress: 0,
        projectId: params.task.projectId,
        goalIds: params.task.goalIds || [],
        tags: params.task.tags || [],
        category: params.task.category,
        impactScore: params.task.impactScore,
        effortHours: params.task.effortHours,
      });
      continue;
    }

    if (type === "generate_org_snapshot") {
      const payload = await buildOrgWorkosSummary({ orgId: params.orgId });
      await InsightSnapshot.create({
        orgId: params.orgId,
        scopeType: "Org",
        scopeId: params.orgId,
        computedAt: new Date(),
        payload,
      });
      continue;
    }
  }
}

export async function runAutomations(params: {
  orgId: mongoose.Types.ObjectId;
  trigger: AutomationTrigger;
  task?: any;
}): Promise<void> {
  const rules = await AutomationRule.find({
    orgId: params.orgId,
    enabled: true,
    trigger: params.trigger,
  }).sort({ createdAt: 1 });
  for (const rule of rules) {
    if (params.task && !matchesConditions(rule, params.task)) continue;
    await runActions({
      orgId: params.orgId,
      trigger: params.trigger,
      task: params.task,
      rule,
    });
  }
}
