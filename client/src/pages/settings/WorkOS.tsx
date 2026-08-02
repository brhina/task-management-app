import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, AlertTriangle, Users, Lightbulb, RefreshCw, Target, TrendingUp,
  AlertCircle, CheckCircle2, ChevronRight, Download, Filter, Layers,
  Calendar, ArrowUpRight, Play, ShieldAlert, Sparkles, Check, FileText
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import StatCard from '../../components/common/StatCard';
import NavTabs from '../../components/common/NavTabs';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getPriorityColor, getStatusColor } from '../../constants/taskStatus';
import WorkOSHealthGauge from '../../components/workos/WorkOSHealthGauge';
import WorkloadHeatmap from '../../components/workos/WorkloadHeatmap';
import WorkOSActionModal from '../../components/workos/WorkOSActionModal';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, tasks: any[]) {
  if (!tasks || tasks.length === 0) return;
  const headers = ['ID', 'Title', 'Status', 'Priority Score', 'Risk Score', 'Assigned To', 'Due Date', 'Effort (h)', 'Blocked'];
  const rows = tasks.map((t) => [
    t._id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.status,
    t.priority?.score ?? 0,
    t.risk?.score ?? 0,
    `"${t.assignedTo?.name || 'Unassigned'}"`,
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
    t.effortHours ?? 0,
    t.blocked ? 'Yes' : 'No',
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WorkOS() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const isAdmin = canAccessAdminSuite();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [data, setData] = useState<any>(null);
  const [runningDaily, setRunningDaily] = useState(false);

  // Scope switcher state
  const [scopes, setScopes] = useState<{ projects: any[]; members: any[] }>({ projects: [], members: [] });
  const [scopeType, setScopeType] = useState<'org' | 'project' | 'user'>('org');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'workload' | 'matrix' | 'schedule' | 'automations'>('overview');

  // Interactive Action Modal
  const [selectedAction, setSelectedAction] = useState<any>(null);

  const orgId = user?.activeOrgId || localStorage.getItem('activeOrgId') || '';

  // Fetch available scopes (projects & members)
  useEffect(() => {
    if (!isAdmin && user?._id) {
      setScopeType('user');
      setSelectedScopeId(user._id);
    }
  }, [isAdmin, user?._id]);

  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const res = await api.get(apiPaths.WORKOS.SCOPES);
        setScopes(res.data?.data || { projects: [], members: [] });
      } catch (err) {
        // Fallback silently if scopes endpoint not ready
      }
    };
    if (user) fetchScopes();
  }, [user]);

  // Fetch WorkOS Summary data based on selected scope
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      let url = apiPaths.WORKOS.ORG_SUMMARY.replace(':id', orgId || 'me');
      if (scopeType === 'project' && selectedScopeId) {
        url = apiPaths.WORKOS.PROJECT_SUMMARY.replace(':id', selectedScopeId);
      } else if (scopeType === 'user' && selectedScopeId) {
        url = apiPaths.WORKOS.USER_SUMMARY.replace(':id', selectedScopeId);
      } else if (!isAdmin) {
        url = apiPaths.WORKOS.USER_SUMMARY.replace(':id', user?._id || 'me');
      }

      const res = await api.get(url);
      setData(res.data?.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load WorkOS analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [orgId, scopeType, selectedScopeId, user, isAdmin]);

  // Daily summary trigger
  const handleRunDaily = async () => {
    try {
      setRunningDaily(true);
      setSuccessMsg('');
      await api.post(apiPaths.AUTOMATION.DAILY_SUMMARY_JOB);
      setSuccessMsg('Daily WorkOS summary job completed!');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to run daily summary job');
    } finally {
      setRunningDaily(false);
    }
  };

  // Memoized task filters
  const topTasks = useMemo(() => {
    const tasks = (data?.tasks || []) as any[];
    return tasks
      .filter((t: any) => t.status !== 'Completed')
      .sort((a: any, b: any) => (b?.priority?.score || 0) - (a?.priority?.score || 0));
  }, [data]);

  const blockedTasks = useMemo(() => {
    return (data?.tasks || []).filter((t: any) => t.blocked);
  }, [data]);

  const urgentTasks = useMemo(() => {
    const tasks = (data?.tasks || []) as any[];
    const now = Date.now();
    return tasks.filter(
      (t: any) => t.status !== 'Completed' && (new Date(t.dueDate).getTime() < now || t.risk?.score > 60)
    );
  }, [data]);

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in to view WorkOS." />;
  }

  return (
    <PageShell
      title="WorkOS Control Center"
      subtitle="Executive intelligence dashboard for priorities, risk mitigation, workload safety, and critical path analysis"
      actions={
        <div className="flex flex-col gap-1 p-1 min-w-[180px]">
          <button
            type="button"
            onClick={fetchData}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleRunDaily}
              disabled={runningDaily || !hasPermission('automation:manage')}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-primary" />
              {runningDaily ? 'Running Sync…' : 'Run Daily Sync'}
            </button>
          )}
          <button
            type="button"
            onClick={() => downloadJson('workos-executive-summary.json', data)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => downloadCsv('workos-tasks-matrix.csv', data?.tasks || [])}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Toast / Feedback Messages */}
        {error && (
          <div className="alert-error flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-rose-500 font-bold ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </span>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-700 font-bold ml-2">×</button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="card p-16 flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary mb-4" />
            <h3 className="text-base font-bold text-slate-800">Computing WorkOS Executive Analytics</h3>
            <p className="text-xs text-slate-500 mt-1">Analyzing dependencies, capacity risks, and goal alignments...</p>
          </div>
        ) : (
          <>
            {/* Health Score Gauge Hero Banner */}
            <WorkOSHealthGauge health={data?.health} />

            {/* Metric KPI Highlights */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Active Tasks"
                value={data?.tasks?.length ?? 0}
                icon={Layers}
                colorTheme="slate"
                subtext={`Estimated ${data?.estimated_effort?.hours ?? 0}h total effort`}
              />

              <StatCard
                title="Urgent & Risks"
                value={urgentTasks.length}
                icon={AlertTriangle}
                colorTheme={urgentTasks.length > 0 ? "rose" : "slate"}
                subtext={`${blockedTasks.length} blocked by prerequisites`}
              />

              <StatCard
                title="Capacity Load"
                value={`${data?.workload?.capacity_utilization ?? 0}%`}
                icon={Users}
                colorTheme="blue"
                progressBarValue={data?.workload?.capacity_utilization ?? 0}
                subtext={`${data?.workload?.overloadedCount ?? 0} member(s) over capacity`}
              />

              <StatCard
                title="Goal Alignment"
                value={`${data?.goal_alignment?.score ?? 0}%`}
                icon={Target}
                colorTheme="purple"
                subtext={`${(data?.goal_alignment?.related_goals || []).length} linked strategic OKRs`}
              />
            </div>

            {/* Navigation Tabs (Horizontally Scrollable on Mobile) */}
            <div className="w-full max-w-full overflow-x-auto no-scrollbar py-1">
              <NavTabs<'overview' | 'workload' | 'matrix' | 'schedule' | 'automations'>
                tabs={[
                  { id: 'overview', label: 'Executive Overview', icon: Sparkles },
                  { id: 'workload', label: 'Team Workload & Capacity', icon: Users },
                  { id: 'matrix', label: 'Priorities & Risk Matrix', icon: Zap },
                  { id: 'schedule', label: 'Schedule & Critical Path', icon: Calendar },
                  { id: 'automations', label: 'Automations & Rules', icon: RefreshCw },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {/* TAB CONTENT 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column: Actions & Recommendations */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Interactive Quick-Actions */}
                  <div className="card bg-white border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">WorkOS Next Best Actions</h3>
                          <p className="text-xs text-slate-500">
                            High-leverage recommendations calculated by the intelligence engine
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Action Cards */}
                    {(data?.interactive_actions || []).length > 0 ? (
                      <div className="space-y-3">
                        {data.interactive_actions.map((act: any) => (
                          <div
                            key={act.id}
                            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                                  {act.impactScore}
                                </span>
                                <h4 className="text-sm font-bold text-slate-800">{act.title}</h4>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                            </div>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setSelectedAction(act)}
                                className="btn btn-primary text-xs px-3.5 py-2 font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
                              >
                                Execute
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {(data?.next_best_actions || []).map((a: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-slate-700 font-medium">{a}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Objective & Strategic Alignment */}
                  <div className="card bg-white border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      Executive Objective & Goal Alignment
                    </h3>
                    <p className="text-xs text-slate-600 mb-4">{data?.objective}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Strategic Alignment Score</span>
                        <div className="text-2xl font-black text-slate-800 mt-1">{data?.goal_alignment?.score ?? 0}%</div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Linked Strategic OKRs</span>
                        <div className="text-xs font-semibold text-slate-700 mt-1 space-y-1">
                          {(data?.goal_alignment?.related_goals || []).length > 0 ? (
                            (data.goal_alignment.related_goals || []).slice(0, 3).map((g: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="truncate">{g.title || `OKR Goal #${i + 1}`}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No specific goals linked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Risks & Mitigations */}
                <div className="space-y-5">
                  <div className="card bg-white border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      Risk Index & Mitigations
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-rose-600 font-bold mb-2">
                          Identified Risks ({data?.risk?.risks?.length ?? 0})
                        </div>
                        {(data?.risk?.risks || []).length === 0 ? (
                          <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            No critical operational risks detected.
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {data.risk.risks.map((r: string, idx: number) => (
                              <li key={idx} className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-100 flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span className="font-medium">{r}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-2">
                          Recommended Mitigations
                        </div>
                        <ul className="space-y-2">
                          {(data?.risk?.mitigations || []).map((m: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-white border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      Efficiency Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {(data?.recommendations || []).map((r: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-600 flex gap-2">
                          <span className="text-purple-500 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: TEAM WORKLOAD */}
            {activeTab === 'workload' && (
              <WorkloadHeatmap
                members={data?.workload?.members || []}
                overallUtilization={data?.workload?.capacity_utilization ?? 0}
                overloadedCount={data?.workload?.overloadedCount ?? 0}
                onRebalanceClick={() =>
                  setSelectedAction({
                    id: 'rebalance_workload',
                    type: 'rebalance_workload',
                    title: 'Smart Workload Rebalance',
                    description: 'Reassign unstarted tasks from overloaded team members to members with open capacity.',
                    impactScore: 'Workload Safety',
                  })
                }
                canManage={isAdmin}
              />
            )}

            {/* TAB CONTENT 3: PRIORITIES & RISK MATRIX */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                <div className="card bg-white border border-gray-200 p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Priority Ranked Task Matrix</h3>
                      <p className="text-xs text-slate-500">Sorted dynamically by urgency, impact, and critical path risk</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{topTasks.length} Active Tasks</span>
                  </div>

                  {topTasks.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">No active tasks in scope.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Rank & Task</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Priority Score</th>
                            <th className="py-3 px-4">Risk Index</th>
                            <th className="py-3 px-4">Assignee</th>
                            <th className="py-3 px-4">Due Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {topTasks.map((t: any, idx: number) => (
                            <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[10px] shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <Link to={`/tasks/${t._id}`} className="font-semibold text-slate-800 hover:text-primary transition-colors">
                                      {t.title}
                                    </Link>
                                    {t.blocked && (
                                      <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase">
                                        Blocked
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${getStatusColor(t.status)}`}>
                                  {t.status}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-800">{t.priority?.score ?? 0}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityColor(t.priority?.level || 'Medium')}`}>
                                    {t.priority?.level || 'Medium'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className={`font-bold ${t.risk?.score > 60 ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {t.risk?.score ?? 0} / 100
                                </span>
                              </td>

                              <td className="py-3 px-4 font-medium text-slate-700">
                                {t.assignedTo?.name || 'Unassigned'}
                              </td>

                              <td className="py-3 px-4 text-slate-600 font-medium">
                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <Link to={`/tasks/${t._id}`} className="text-primary hover:text-primary-hover font-semibold">
                                  View →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: SCHEDULE & CRITICAL PATH */}
            {activeTab === 'schedule' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Critical Path Flow */}
                <div className="card bg-white border border-gray-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Critical Path Sequence
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Sequential dependency chain determining total project completion time
                  </p>

                  {(data?.critical_path || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                      No dependent critical path sequence detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.critical_path.map((taskId: string, idx: number) => {
                        const task = (data?.tasks || []).find((t: any) => t._id === taskId);
                        return (
                          <div key={taskId} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                              <Link to={`/tasks/${taskId}`} className="text-xs font-bold text-slate-800 hover:text-primary">
                                {task?.title || `Task #${taskId}`}
                              </Link>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {task?.effortHours ?? 1}h effort
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Suggested Deep Work Schedule */}
                <div className="card bg-white border border-gray-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Suggested Deep-Work Calendar Blocks
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Optimized execution blocks for highest impact work items
                  </p>

                  {(data?.suggested_schedule || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                      No schedule suggestions available.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.suggested_schedule.map((s: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{s.suggestion}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: AUTOMATIONS & RULES */}
            {activeTab === 'automations' && (
              <div className="card bg-white border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-600" />
                      Active WorkOS Rules & Automations
                    </h3>
                    <p className="text-xs text-slate-500">Automated triggers executing to maintain organization efficiency</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {(data?.automations || []).map((auto: string, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span className="font-medium">{auto}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interactive Quick Action Modal */}
      {selectedAction && (
        <WorkOSActionModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            fetchData();
          }}
        />
      )}
    </PageShell>
  );
}
