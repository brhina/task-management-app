import PlanPreview from '../intelligence/PlanPreview';
import JsonBlock from '../intelligence/JsonBlock';
import {
  getRiskLevelColor,
  normalizeExecutive,
  normalizeProjectPlan,
  normalizeRiskAnalysis,
  normalizeSprintPlan,
  normalizeStatusReport,
  normalizeTaskBreakdown,
} from '../../utils/intelligence';

interface AssistantResultViewProps {
  intent?: string;
  result: unknown;
}

export default function AssistantResultView({ intent, result }: AssistantResultViewProps) {
  if (result == null) return null;

  const plan = normalizeProjectPlan(result);
  if (plan || intent === 'plan_project') {
    if (plan) return <PlanPreview plan={plan} />;
  }

  const breakdown = normalizeTaskBreakdown(result);
  if (breakdown || intent === 'breakdown_task') {
    if (breakdown) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{breakdown.summary}</p>
          <div className="rounded-lg border border-app-border bg-white/5 p-3">
            <div className="text-xs text-slate-400 mb-2">
              {breakdown.subtasks?.length} subtasks · {breakdown.totalEstimatedHours}h total
            </div>
            <ul className="space-y-2">
              {breakdown.subtasks.map((st, i) => (
                <li key={i} className="border-l-2 border-primary/40 pl-2 text-sm">
                  <div className="font-medium text-slate-200">{st.title}</div>
                  <div className="text-xs text-slate-500">
                    {st.estimatedHours}h · complexity {st.complexityScore}/10
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
  }

  const risks = normalizeRiskAnalysis(result);
  if (risks || intent === 'analyze_risks') {
    if (risks) {
      return (
        <div className="space-y-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskLevelColor(risks.riskLevel)}`}
          >
            {risks.riskLevel}
          </span>
          <p className="text-sm text-slate-300">{risks.summary}</p>
          {risks.recommendations?.length > 0 && (
            <ul className="text-sm text-slate-400 space-y-1">
              {risks.recommendations.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }
  }

  const sprint = normalizeSprintPlan(result);
  if (sprint || intent === 'plan_sprint') {
    if (sprint) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{sprint.summary}</p>
          <ul className="text-sm text-slate-400 space-y-1">
            {sprint.assignments?.slice(0, 8).map((a, i) => (
              <li key={i}>
                {a.taskTitle} — {a.assigneeName || 'Unassigned'} ({a.effortHours}h)
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }

  const report = normalizeStatusReport(result);
  if (report || intent === 'generate_report') {
    if (report) {
      return (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-white">{report.title}</h4>
            <p className="text-sm text-slate-400 mt-1">{report.summary}</p>
          </div>
          {report.highlights?.length > 0 && (
            <ul className="text-sm text-slate-400 space-y-1">
              {report.highlights.map((h, i) => (
                <li key={i}>• {h}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }
  }

  const executive = normalizeExecutive(result);
  if (executive || intent === 'portfolio_intelligence') {
    if (executive) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskLevelColor(executive.portfolioHealth === 'Healthy' ? 'Low' : 'High')}`}
            >
              {executive.portfolioHealth}
            </span>
            <span className="text-sm text-slate-400">{executive.healthScore}% health</span>
          </div>
          <p className="text-sm text-slate-300">{executive.summary}</p>
        </div>
      );
    }
  }

  return <JsonBlock data={result} maxHeight="max-h-64" />;
}
