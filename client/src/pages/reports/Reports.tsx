import { useState, useEffect, useContext } from 'react';
import {
  FileText,
  Users,
  Folder,
  Target,
  Filter,
  Download,
  Info,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { UserContext } from '../../context/UserContext';
import { apiPaths } from '../../utils/apiPaths';
import axios from '../../utils/axios';
import PageShell from '../../components/common/PageShell';

interface ReportSummary {
  totalTasks: number;
  totalProjects: number;
  totalGoals: number;
  totalMembers: number;
  tasksByStatus: {
    pending: number;
    inProgress: number;
    inReview: number;
    completed: number;
  };
  overdueTasks: number;
  completionRate: number;
}

const STATUS_COLORS = ['#94a3b8', '#3b82f6', '#a855f7', '#10b981'];

const Reports = () => {
  const { user, hasPermission } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [teamPerf, setTeamPerf] = useState<any[]>([]);
  const [velocity, setVelocity] = useState<any>(null);
  const [cfd, setCfd] = useState<any[]>([]);
  const [projectHealth, setProjectHealth] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [burndown, setBurndown] = useState<any>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [timeReport, setTimeReport] = useState<any>(null);
  const [deps, setDeps] = useState<any>(null);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const canView = hasPermission('report:view');
  const canExport = hasPermission('report:export');

  useEffect(() => {
    if (!canView) return;
    fetchAll();
  }, [canView]);

  const fetchAll = async () => {
    try {
      setSummaryLoading(true);
      const [
        summaryRes,
        trendsRes,
        teamRes,
        velocityRes,
        cfdRes,
        healthRes,
        heatRes,
        timeRes,
        depsRes,
      ] = await Promise.all([
        axios.get(apiPaths.REPORTS.SUMMARY),
        axios.get(`${apiPaths.REPORTS.TRENDS}?days=30`),
        axios.get(apiPaths.REPORTS.TEAM_PERFORMANCE),
        axios.get(apiPaths.REPORTS.SPRINT_VELOCITY),
        axios.get(`${apiPaths.REPORTS.CUMULATIVE_FLOW}?days=30`),
        axios.get(apiPaths.REPORTS.PROJECT_HEALTH),
        axios.get(apiPaths.REPORTS.WORKLOAD_HEATMAP),
        axios.get(apiPaths.TIME_ENTRIES.REPORT).catch(() => null),
        axios.get(apiPaths.DEPENDENCIES.ANALYSIS).catch(() => null),
      ]);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data.data);
      setTeamPerf(teamRes.data.data || []);
      setVelocity(velocityRes.data.data);
      setSprints(velocityRes.data.data?.sprints || []);
      setCfd(cfdRes.data.data?.series || []);
      setProjectHealth(healthRes.data.data || []);
      setHeatmap(heatRes.data.data || []);
      setTimeReport(timeRes?.data?.data || null);
      setDeps(depsRes?.data?.data || null);

      const activeSprint = (velocityRes.data.data?.sprints || []).find(
        (s: any) => s.status === 'Active'
      );
      if (activeSprint) {
        setSelectedSprint(activeSprint.sprintId);
        await loadBurndown(activeSprint.sprintId);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadBurndown = async (sprintId: string) => {
    try {
      const res = await axios.get(
        `${apiPaths.REPORTS.BURNDOWN}?sprintId=${sprintId}`
      );
      setBurndown(res.data.data);
    } catch {
      setBurndown(null);
    }
  };

  if (!user || !canView) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to view reports." />
    );
  }

  const downloadReport = async (reportType: string) => {
    if (!canExport) {
      setError('You do not have permission to export reports.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    try {
      let url: string;
      let filename: string;

      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const queryString = params.toString();
      const suffix = queryString ? `?${queryString}` : '';

      switch (reportType) {
        case 'tasks':
          url = `${apiPaths.REPORTS.Export_TASKS_REPORT}${suffix}`;
          filename = 'tasks_report.xlsx';
          break;
        case 'users':
          url = `${apiPaths.REPORTS.Export_USERS_REPORT}${suffix}`;
          filename = 'users_report.xlsx';
          break;
        case 'projects':
          url = `${apiPaths.REPORTS.Export_PROJECTS_REPORT}${suffix}`;
          filename = 'projects_report.xlsx';
          break;
        case 'goals':
          url = `${apiPaths.REPORTS.Export_GOALS_REPORT}${suffix}`;
          filename = 'goals_report.xlsx';
          break;
        default:
          return;
      }

      const response = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url_blob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_blob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);

      setMessage(
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded successfully!`
      );
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError(err.response?.data?.message || 'Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusPie = summary
    ? [
        { name: 'Pending', value: summary.tasksByStatus.pending },
        { name: 'In Progress', value: summary.tasksByStatus.inProgress },
        { name: 'In Review', value: summary.tasksByStatus.inReview },
        { name: 'Completed', value: summary.tasksByStatus.completed },
      ]
    : [];

  const heatmapUsers = Array.from(new Set(heatmap.map((c) => c.name)));
  const heatmapDays = Array.from(new Set(heatmap.map((c) => c.day))).sort();

  const reportTypes = [
    {
      id: 'tasks',
      title: 'Tasks Report',
      description: 'Export all tasks with status, priority, assignments, and progress.',
      icon: <FileText className="w-6 h-6" />,
      stats: summary
        ? [
            { label: 'Total', value: summary.totalTasks },
            { label: 'Completed', value: summary.tasksByStatus.completed },
            { label: 'Overdue', value: summary.overdueTasks },
          ]
        : [],
    },
    {
      id: 'users',
      title: 'Users Report',
      description: 'Export user performance with completion rates and workload.',
      icon: <Users className="w-6 h-6" />,
      stats: summary
        ? [
            { label: 'Members', value: summary.totalMembers },
            { label: 'Completion', value: `${summary.completionRate}%` },
          ]
        : [],
    },
    {
      id: 'projects',
      title: 'Projects Report',
      description: 'Export project progress and task distribution.',
      icon: <Folder className="w-6 h-6" />,
      stats: summary ? [{ label: 'Projects', value: summary.totalProjects }] : [],
    },
    {
      id: 'goals',
      title: 'Goals Report',
      description: 'Export strategic goals with linked projects and progress.',
      icon: <Target className="w-6 h-6" />,
      stats: summary ? [{ label: 'Goals', value: summary.totalGoals }] : [],
    },
  ];

  return (
    <PageShell
      title="Reports & Analytics"
      subtitle="Trends, team performance, sprint charts, and Excel exports."
    >
      <div className="space-y-6">
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-400">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Completion', value: summary ? `${summary.completionRate}%` : '—' },
            { label: 'Overdue', value: summary?.overdueTasks ?? '—' },
            {
              label: 'Est. days to clear',
              value: trends?.productivity?.estimatedDaysToClear ?? '—',
            },
            {
              label: 'Avg velocity (hrs)',
              value: velocity?.averageVelocityHours ?? '—',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white/50 border border-gray-200/50 rounded-xl p-4"
            >
              <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Completion trends (30d)
            </h3>
            <div className="h-56">
              {summaryLoading || !trends?.series ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                      }}
                    />
                    <Line type="monotone" dataKey="created" stroke="#94a3b8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3">Status distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Cumulative flow
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cfd}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Area type="monotone" dataKey="Pending" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="In Review" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="Completed" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-800 font-semibold">Sprint burndown</h3>
              <select
                value={selectedSprint}
                onChange={(e) => {
                  setSelectedSprint(e.target.value);
                  if (e.target.value) loadBurndown(e.target.value);
                }}
                className="bg-gray-100 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-800"
              >
                <option value="">Select sprint</option>
                {sprints.map((s) => (
                  <option key={s.sprintId} value={s.sprintId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-56">
              {!burndown?.burndown?.length ? (
                <p className="text-sm text-slate-500">Select a sprint to view burndown.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burndown.burndown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                      }}
                    />
                    <Line type="monotone" dataKey="remaining" stroke="#ef4444" strokeWidth={2} name="Remaining" />
                    <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" name="Ideal" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3">Sprint velocity</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="velocityHours" fill="#3b82f6" name="Velocity hrs" />
                  <Bar dataKey="plannedHours" fill="#475569" name="Planned hrs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Team performance + health */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4 overflow-x-auto">
            <h3 className="text-slate-800 font-semibold mb-3">Team performance</h3>
            <table className="w-full text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1 pr-2">Member</th>
                  <th className="py-1 pr-2">Done/wk</th>
                  <th className="py-1 pr-2">Rate</th>
                  <th className="py-1 pr-2">Hours</th>
                  <th className="py-1">Workload</th>
                </tr>
              </thead>
              <tbody>
                {teamPerf.slice(0, 10).map((m) => (
                  <tr key={m.userId} className="border-t border-gray-200/40 text-slate-600">
                    <td className="py-1.5 pr-2 text-slate-800">{m.name}</td>
                    <td className="py-1.5 pr-2">{m.completedThisWeek}</td>
                    <td className="py-1.5 pr-2">{m.completionRate}%</td>
                    <td className="py-1.5 pr-2">{m.hoursLoggedThisWeek}</td>
                    <td className="py-1.5">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, m.workloadScore)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3">Project health</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projectHealth.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between gap-3 bg-gray-100/50 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-slate-800">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {p.completionRate}% complete · {p.overdueTasks} overdue
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                      p.health === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : p.health === 'at_risk'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {p.healthScore}
                  </span>
                </div>
              ))}
              {projectHealth.length === 0 && (
                <p className="text-sm text-slate-500">No projects yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Workload heatmap */}
        <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4 overflow-x-auto">
          <h3 className="text-slate-800 font-semibold mb-3">Workload heatmap (this week)</h3>
          {heatmapUsers.length === 0 ? (
            <p className="text-sm text-slate-500">No workload data.</p>
          ) : (
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 pr-3 py-1">Member</th>
                  {heatmapDays.map((d) => (
                    <th key={d} className="text-slate-500 px-1 py-1 font-normal">
                      {d.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapUsers.map((name) => (
                  <tr key={name}>
                    <td className="text-slate-600 pr-3 py-1 whitespace-nowrap">{name}</td>
                    {heatmapDays.map((day) => {
                      const cell = heatmap.find((c) => c.name === name && c.day === day);
                      const intensity = Math.min(1, (cell?.taskCount || 0) / 5);
                      return (
                        <td key={day} className="px-1 py-1">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-[10px] text-slate-800"
                            style={{
                              backgroundColor: `rgba(59, 130, 246, ${0.15 + intensity * 0.75})`,
                            }}
                            title={`${cell?.taskCount || 0} tasks / ${cell?.effortHours || 0}h`}
                          >
                            {cell?.taskCount || 0}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Time tracking summary */}
        {timeReport && (
          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3">Time tracking</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {Math.round((timeReport.totalHours || 0) * 10) / 10}h
                </div>
                <div className="text-[10px] uppercase text-slate-500">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {Math.round((timeReport.billableHours || 0) * 10) / 10}h
                </div>
                <div className="text-[10px] uppercase text-slate-500">Billable</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">
                  {Math.round((timeReport.nonBillableHours || 0) * 10) / 10}h
                </div>
                <div className="text-[10px] uppercase text-slate-500">Non-billable</div>
              </div>
            </div>
          </div>
        )}

        {deps && (
          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-3">Dependency analysis</h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {deps.criticalPath?.length || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Critical path</div>
              </div>
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {deps.blockedTaskIds?.length || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Blocked</div>
              </div>
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">{deps.cycles?.length || 0}</div>
                <div className="text-[10px] uppercase text-slate-500">Cycles</div>
              </div>
            </div>
            {(deps.bottlenecks || []).slice(0, 5).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 mb-1">Top bottlenecks</p>
                {deps.bottlenecks.slice(0, 5).map((b: any) => (
                  <div
                    key={b.taskId}
                    className="flex justify-between text-xs text-slate-600 bg-gray-100/40 rounded px-2 py-1.5"
                  >
                    <span className="font-mono">{String(b.taskId).slice(-8)}</span>
                    <span>{b.blockedDependents} dependents</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters + exports */}
        <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Export filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {canExport && (
          <div className="grid md:grid-cols-2 gap-4">
            {reportTypes.map((report) => (
              <div key={report.id} className="card hover:border-primary/40 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-primary">{report.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-800">{report.title}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">{report.description}</p>
                {report.stats.length > 0 && (
                  <div className="flex gap-4 mb-4">
                    {report.stats.map((stat, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-bold text-slate-800">{stat.value}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => downloadReport(report.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-gray-200/80 border border-slate-600/50 rounded-lg text-sm font-medium text-slate-800 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/30 border border-gray-200/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 mt-0.5" />
            <div className="text-sm text-slate-500 space-y-1">
              <p className="font-medium text-slate-600">About analytics</p>
              <p>• Predictive completion uses the last 7 days of completed-task velocity.</p>
              <p>• Burndown uses sprint effort hours and status-change activity.</p>
              <p>• Project health scores weigh overdue work, completion rate, and target dates.</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Reports;


