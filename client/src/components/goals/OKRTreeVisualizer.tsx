import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, Folder, ChevronDown, ChevronRight, CheckSquare, Layers } from 'lucide-react';
import type { Goal, KeyResult, Project, Task } from '../../types';

interface OKRTreeVisualizerProps {
  goal: Goal;
  keyResults: KeyResult[];
  linkedProjects: Project[];
  linkedTasks: Task[];
  onCheckInKR?: (kr: KeyResult) => void;
}

export default function OKRTreeVisualizer({
  goal,
  keyResults,
  linkedProjects,
  linkedTasks,
  onCheckInKR,
}: OKRTreeVisualizerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    [goal._id]: true,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'On Track':
      case 'Completed':
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'At Risk':
      case 'Behind':
        return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
      case 'In Progress':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">OKR Strategic Alignment Tree</h3>
            <p className="text-xs text-slate-500">Visual mapping of objective down to key results, projects, and tasks</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const allExpanded = keyResults.every((kr) => expandedNodes[kr._id]);
            const newExpanded: Record<string, boolean> = { [goal._id]: !allExpanded };
            keyResults.forEach((kr) => (newExpanded[kr._id] = !allExpanded));
            setExpandedNodes(newExpanded);
          }}
          className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          {keyResults.every((kr) => expandedNodes[kr._id]) ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Goal Node */}
      <div className="space-y-3">
        <div className="border border-slate-200 rounded-xl p-3.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => toggleNode(goal._id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                {expandedNodes[goal._id] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <Target className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 truncate">{goal.title}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusBadge(goal.status)}`}>
                    {goal.status || 'On Track'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {goal.category || 'Company'}
                  </span>
                </div>
                {goal.objective && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{goal.objective}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 block tabular-nums">
                  {goal.targetValue
                    ? `${Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100))}%`
                    : `${keyResults.length} KRs`}
                </span>
                <span className="text-[10px] text-slate-400">Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Results List */}
        {expandedNodes[goal._id] && (
          <div className="pl-6 space-y-3 border-l-2 border-primary/20 ml-4">
            {keyResults.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 italic">
                No key results defined for this goal yet.
              </div>
            ) : (
              keyResults.map((kr) => {
                const krPct = kr.progressPercent ?? 0;
                const isKrExpanded = expandedNodes[kr._id];

                return (
                  <div key={kr._id} className="space-y-2">
                    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleNode(kr._id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          >
                            {isKrExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-700 block truncate">
                              {kr.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              {kr.metric && <span>Metric: {kr.metric}</span>}
                              <span className={`px-1.5 py-0.2 font-medium rounded border ${getStatusBadge(kr.status)}`}>
                                {kr.status || 'In Progress'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
                              <span>{kr.currentValue ?? 0} / {kr.targetValue ?? '—'}</span>
                              <span className="font-semibold">{krPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full transition-all"
                                style={{ width: `${krPct}%` }}
                              />
                            </div>
                          </div>
                          {onCheckInKR && (
                            <button
                              type="button"
                              onClick={() => onCheckInKR(kr)}
                              className="px-2 py-1 text-[10px] font-semibold rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                            >
                              Check in
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Linked Projects & Tasks under KR */}
                    {isKrExpanded && (
                      <div className="pl-6 space-y-1.5 border-l-2 border-violet-200/60 ml-4">
                        {(kr.linkedProjectIds || []).map((projId) => {
                          const proj = linkedProjects.find((p) => p._id === projId);
                          if (!proj) return null;
                          return (
                            <div
                              key={proj._id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="font-medium text-slate-700">{proj.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">{proj.status}</span>
                            </div>
                          );
                        })}

                        {(kr.linkedTaskIds || []).map((taskId) => {
                          const task = linkedTasks.find((t) => t._id === taskId);
                          if (!task) return null;
                          return (
                            <Link
                              key={task._id}
                              to={`/tasks/${task._id}`}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-medium text-slate-700 truncate">{task.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 shrink-0">{task.status}</span>
                            </Link>
                          );
                        })}

                        {(!kr.linkedProjectIds || kr.linkedProjectIds.length === 0) &&
                          (!kr.linkedTaskIds || kr.linkedTaskIds.length === 0) && (
                            <div className="text-[11px] text-slate-400 py-1 italic">
                              No specific projects or tasks linked directly to this KR.
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
