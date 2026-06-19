import type { ProjectPlan } from '../../types/intelligence';
import { getRiskLevelColor, groupTasksByMilestone } from '../../utils/intelligence';

export default function PlanPreview({ plan }: { plan: ProjectPlan }) {
  const grouped = groupTasksByMilestone(plan.tasks);

  return (
    <div className="space-y-4">
      {plan.summary && (
        <p className="text-sm text-slate-300 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          {plan.summary}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card !p-3 text-center">
          <div className="text-2xl font-bold text-white">{plan.milestones.length}</div>
          <div className="text-xs text-slate-400">Milestones</div>
        </div>
        <div className="card !p-3 text-center">
          <div className="text-2xl font-bold text-white">{plan.tasks.length}</div>
          <div className="text-xs text-slate-400">Tasks</div>
        </div>
        <div className="card !p-3 text-center">
          <div className="text-2xl font-bold text-primary">
            {plan.estimates?.totalEffortHours ?? 0}h
          </div>
          <div className="text-xs text-slate-400">Est. Effort</div>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">Milestones</h4>
        <ul className="space-y-2">
          {plan.milestones.map((m, i) => (
            <li key={i} className="flex justify-between gap-2 text-sm">
              <span className="text-slate-200">{m.title}</span>
              <span className="text-slate-500 shrink-0">{m.targetDate}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">Tasks by Milestone</h4>
        {Array.from(grouped.entries()).map(([milestone, tasks]) => (
          <div key={milestone} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              {milestone}
            </div>
            <ul className="space-y-1.5">
              {tasks.map((t, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-2 text-sm text-slate-300 border-l-2 border-app-border pl-3"
                >
                  <span>{t.title}</span>
                  <span className="text-slate-500 shrink-0">{t.effortHours ?? 1}h</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {plan.dependencies.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Dependencies</h4>
          <ul className="space-y-1 text-sm text-slate-400">
            {plan.dependencies.map((d, i) => (
              <li key={i}>
                {d.fromTask} → {d.toTask}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.risks.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-200 mb-3">Risks</h4>
          <ul className="space-y-2">
            {plan.risks.map((r, i) => (
              <li key={i} className="text-sm">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold mr-2 ${getRiskLevelColor(r.severity)}`}
                >
                  {r.severity}
                </span>
                <span className="text-slate-200">{r.title}</span>
                <p className="text-slate-400 mt-0.5 text-xs">{r.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
