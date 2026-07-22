import cron from "node-cron";
import Task from "../models/Task.js";

function advanceNextRun(
  from: Date,
  frequency: "daily" | "weekly" | "monthly",
  interval: number,
): Date {
  const next = new Date(from);
  if (frequency === "daily") {
    next.setDate(next.getDate() + interval);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7 * interval);
  } else {
    next.setMonth(next.getMonth() + interval);
  }
  return next;
}

export async function processRecurringTasks(): Promise<number> {
  const now = new Date();
  const due = await Task.find({
    recurrence: { $ne: null },
    "recurrence.nextRunAt": { $lte: now },
    parentTaskId: { $exists: false },
  }).limit(50);

  let created = 0;

  for (const source of due) {
    if (!source.recurrence) continue;
    if (source.recurrence.endDate && source.recurrence.endDate < now) {
      source.recurrence = null;
      await source.save();
      continue;
    }

    const dueDate = new Date(source.dueDate);
    const startDate = source.startDate ? new Date(source.startDate) : undefined;
    const spanMs =
      startDate && dueDate.getTime() > startDate.getTime()
        ? dueDate.getTime() - startDate.getTime()
        : 7 * 24 * 60 * 60 * 1000;

    const newStart = new Date();
    const newDue = new Date(newStart.getTime() + spanMs);

    await Task.create({
      orgId: source.orgId,
      title: source.title,
      description: source.description,
      priority: source.priority,
      status: "Pending",
      dueDate: newDue,
      startDate: newStart,
      projectId: source.projectId,
      goalIds: source.goalIds,
      tags: source.tags,
      category: source.category,
      impactScore: source.impactScore,
      effortHours: source.effortHours,
      collaborators: source.collaborators,
      blockersText: source.blockersText,
      assignedTo: source.assignedTo,
      createdBy: source.createdBy,
      attachments: [],
      todoCheckList: (source.todoCheckList || []).map((t) => ({
        text: t.text,
        isCompleted: false,
      })),
      progress: 0,
      customFields: source.customFields,
      sprintId: undefined,
      recurrence: null,
    });

    source.recurrence.nextRunAt = advanceNextRun(
      source.recurrence.nextRunAt,
      source.recurrence.frequency,
      source.recurrence.interval || 1,
    );
    await source.save();
    created += 1;
  }

  return created;
}

export function startRecurringTasksJob(): void {
  cron.schedule("* * * * *", async () => {
    try {
      const n = await processRecurringTasks();
      if (n > 0) {
        console.log(`Recurring tasks: created ${n} instance(s)`);
      }
    } catch (err) {
      console.error("Recurring tasks job failed:", err);
    }
  });
  console.log("Recurring tasks cron started (every minute)");
}
