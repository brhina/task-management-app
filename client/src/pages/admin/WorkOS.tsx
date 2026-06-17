import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getPriorityColor, getStatusColor } from '../../constants/taskStatus';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function HealthBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Healthy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}
    >
      {status || 'Unknown'}
    </span>
  );
}

function ScoreRing({
  score,
  size = 48,
  stroke = 4,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-200">
        {score}
      </div>
    </div>
  );
}

function WorkOS() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [runningDaily, setRunningDaily] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'schedule' | 'insights'>(
    'overview'
  );

  const orgId = user?.activeOrgId || localStorage.getItem('activeOrgId') || '';

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.WORKOS.ORG_SUMMARY.replace(':id', orgId || 'me'));
      setData(res.data?.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load WorkOS summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [orgId]);

  const topTasks = useMemo(() => {
    const tasks = (data?.tasks || []) as any[];
    return tasks
      .filter((t: any) => t.status !== 'Completed')
      .sort((a: any, b: any) => (b?.priority?.score || 0) - (a?.priority?.score || 0))
      .slice(0, 10);
  }, [data]);

  const blockedTasks = useMemo(() => {
    return (data?.tasks || []).filter((t: any) => t.blocked).slice(0, 5);
  }, [data]);

  const handleRunDaily = async () => {
    try {
      setRunningDaily(true);
      await api.post(apiPaths.AUTOMATION.DAILY_SUMMARY_JOB);
      await fetchSummary();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to run daily summary job');
    } finally {
      setRunningDaily(false);
    }
  };

  const effectiveRole = getEffectiveRole();
  if (!user || effectiveRole !== 'OrgAdmin') {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  if (loading) {
    return (
      <PageShell title="WorkOS" subtitle="Computing org execution intelligence...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'actions' as const, label: 'Actions' },
    { id: 'schedule' as const, label: 'Schedule' },
    { id: 'insights' as const, label: 'Insights' },
  ];

  return (
    <PageShell
      title="WorkOS"
      subtitle="Execution intelligence across priorities, risks, workload, and next-best-actions"
      actions={
        <div className="flex flex-wrap gap-2">
          {/* <button className="btn-secondary" type="button" onClick={fetchSummary}>Refresh</button> */}
          <button
            className="btn-secondary disabled:opacity-50"
            type="button"
            onClick={handleRunDaily}
            disabled={runningDaily}
          >
            {runningDaily ? 'Running…' : 'Run summary'}
          </button>
          <button
            className="btn-primary"
            type="button"
            onClick={() => downloadJson('workos-summary.json', data)}
          >
            Download
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card flex items-center gap-3">
            <ScoreRing score={data?.risk?.score ?? 0} />
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Health</div>
              <HealthBadge status={data?.health_status} />
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <ScoreRing score={data?.priority?.score ?? 0} />
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Priority</div>
              <div className="text-sm font-semibold text-slate-200">
                {data?.priority?.level || '—'}
              </div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <ScoreRing score={data?.risk?.score ?? 0} />
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Risk</div>
              <div className="text-sm font-semibold text-slate-200">{data?.risk?.level || '—'}</div>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg width={48} height={48} className="-rotate-90">
                <circle
                  cx={24}
                  cy={24}
                  r={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={4}
                  className="text-slate-700"
                />
                <circle
                  cx={24}
                  cy={24}
                  r={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={4}
                  strokeDasharray={125.66}
                  strokeDashoffset={
                    125.66 - ((data?.workload?.capacity_utilization ?? 0) / 100) * 125.66
                  }
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-200">
                {data?.workload?.capacity_utilization ?? 0}%
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Workload</div>
              <div
                className={`text-sm font-semibold ${data?.workload?.overloaded ? 'text-amber-400' : 'text-emerald-400'}`}
              >
                {data?.workload?.overloaded ? 'Overloaded' : 'Balanced'}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Banner */}
        <div className="card bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-200">
                {data?.summary || 'No summary available.'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{data?.objective}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{data?.estimated_effort?.hours ?? 0}h estimated</span>
              <span>Goal alignment: {data?.goal_alignment?.score ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Next Best Actions */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Next Best Actions
              </h3>
              {(data?.next_best_actions || []).length === 0 ? (
                <div className="text-sm text-slate-400 py-4 text-center">No actions suggested.</div>
              ) : (
                <ul className="space-y-2">
                  {data.next_best_actions.map((a: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300">{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Risks & Mitigations */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Risks & Mitigations
              </h3>
              <div className="space-y-3">
                {(data?.risk?.risks || []).length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1.5">
                      Risks
                    </div>
                    <ul className="space-y-1">
                      {(data?.risk?.risks || []).map((r: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-rose-400 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(data?.risk?.mitigations || []).length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5">
                      Mitigations
                    </div>
                    <ul className="space-y-1">
                      {(data?.risk?.mitigations || []).map((m: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(data?.risk?.risks || []).length === 0 && (
                  <div className="text-sm text-slate-400 py-2 text-center">No risks detected.</div>
                )}
              </div>
            </div>

            {/* Workload Recommendations */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Workload
              </h3>
              <ul className="space-y-1.5">
                {(data?.workload?.recommendations || []).map((r: string, idx: number) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Recommendations
              </h3>
              <ul className="space-y-1.5">
                {(data?.recommendations || []).map((r: string, idx: number) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {/* Top Priorities */}
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Top Priorities</h3>
                <span className="text-[10px] text-slate-500">Ranked by priority score</span>
              </div>
              {topTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No active tasks.</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {topTasks.map((t: any, idx: number) => (
                    <div key={t._id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/task/${t._id}`}
                              className="text-sm font-medium text-slate-200 hover:text-primary truncate"
                            >
                              {t.title}
                            </Link>
                            {t.blocked && (
                              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">
                                BLOCKED
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span
                              className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.status === 'Completed' ? 'Low' : t.risk?.score > 50 ? 'High' : t.risk?.score > 25 ? 'Medium' : 'Low')}`}
                            >
                              {t.status}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Score: {t.priority?.score ?? 0}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Impact: {t.impactScore ?? '—'}/10
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Effort: {t.effortHours ?? '—'}h
                            </span>
                            {t.assignedTo?.name && (
                              <span className="text-[10px] text-slate-500">
                                → {t.assignedTo.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Tasks */}
            {blockedTasks.length > 0 && (
              <div className="card !p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="text-sm font-semibold text-rose-400">
                    Blocked Tasks ({blockedTasks.length})
                  </h3>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {blockedTasks.map((t: any) => (
                    <div key={t._id} className="px-4 py-3">
                      <Link
                        to={`/admin/task/${t._id}`}
                        className="text-sm font-medium text-slate-200 hover:text-primary"
                      >
                        {t.title}
                      </Link>
                      <div className="text-[10px] text-rose-400 mt-1">Blocked by dependencies</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-200">Suggested Schedule</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Deep-work blocks for top priority tasks
              </p>
            </div>
            {(data?.suggested_schedule || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No schedule suggestions.</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {data.suggested_schedule.map((s: any, idx: number) => (
                  <div key={idx} className="px-4 py-3 flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <Link
                        to={`/admin/task/${s.taskId}`}
                        className="text-sm font-medium text-slate-200 hover:text-primary"
                      >
                        {topTasks.find((t: any) => t._id === s.taskId)?.title || s.taskId}
                      </Link>
                      <div className="text-xs text-slate-400 mt-1">{s.suggestion}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Automations */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Active Automations
              </h3>
              <ul className="space-y-2">
                {(data?.automations || []).map((a: string, idx: number) => (
                  <li key={idx} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Goal Alignment */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                Goal Alignment
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-bold text-slate-200">
                  {data?.goal_alignment?.score ?? 0}%
                </div>
                <div className="text-xs text-slate-400">Strategic alignment score</div>
              </div>
              {(data?.goal_alignment?.related_goals || []).length > 0 && (
                <div className="text-xs text-slate-400">
                  {data.goal_alignment.related_goals.length} goals linked
                </div>
              )}
            </div>

            {/* Critical Path */}
            <div className="card lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Critical Path
              </h3>
              {(data?.critical_path || []).length === 0 ? (
                <div className="text-sm text-slate-400 py-2">No critical path detected.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.critical_path.map((taskId: string, idx: number) => {
                    const task = (data?.tasks || []).find((t: any) => t._id === taskId);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Link
                          to={`/admin/task/${taskId}`}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {task?.title || taskId}
                        </Link>
                        {idx < data.critical_path.length - 1 && (
                          <span className="text-slate-600">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default WorkOS;
