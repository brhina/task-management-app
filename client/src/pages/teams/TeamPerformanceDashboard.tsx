import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  ArrowLeft,
  RefreshCw,
  Download,
  UsersRound,
  Crown,
  TrendingUp,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { apiPaths } from '../../utils/apiPaths';
import api from '../../utils/axios';
import PageShell from '../../components/common/PageShell';

interface MemberPerformance {
  member: {
    _id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  };
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
}

interface TeamDashboardData {
  team: {
    _id: string;
    name: string;
    description?: string;
    lead?: {
      _id: string;
      name: string;
      email: string;
      profileImageUrl?: string;
    };
    memberCount: number;
    members?: Array<{
      _id: string;
      name: string;
      email: string;
      profileImageUrl?: string;
    }>;
  };
  statistics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    completedLast30Days: number;
    completionRate: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  memberPerformance: MemberPerformance[];
  recentTasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignedTo?: {
      _id: string;
      name: string;
      email?: string;
      profileImageUrl?: string;
    };
    updatedAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10b981',
  'In Progress': '#3b82f6',
  Pending: '#f59e0b',
  'In Review': '#8b5cf6',
  Cancelled: '#64748b',
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#ef4444',
  High: '#f97316',
  Medium: '#06b6d4',
  Low: '#64748b',
};

export default function TeamPerformanceDashboard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(id || '');
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [teamsLoading, setTeamsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Fetch all teams for selector
  const fetchTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      const res = await api.get(apiPaths.TEAMS.LIST);
      const teamList = res.data.data || [];
      setTeams(teamList);

      if (!id && teamList.length > 0) {
        setSelectedTeamId(teamList[0]._id);
      } else if (id) {
        setSelectedTeamId(id);
      }
    } catch (err: any) {
      console.error('Failed to fetch teams list:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Fetch performance data
  const fetchDashboardData = useCallback(async (teamId: string) => {
    if (!teamId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.TEAMS.DASHBOARD.replace(':id', teamId));
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team dashboard statistics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchDashboardData(selectedTeamId);
    }
  }, [selectedTeamId, fetchDashboardData]);

  const handleSelectTeam = (newTeamId: string) => {
    setSelectedTeamId(newTeamId);
    navigate(`/teams/${newTeamId}/performance`);
  };

  const handleExportData = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `${data.team.name.toLowerCase().replace(/\s+/g, '_')}_performance_report.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const statusPieData = data
    ? Object.entries(data.statistics.byStatus || {}).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || '#94a3b8',
      }))
    : [];

  const priorityBarData = data
    ? Object.entries(data.statistics.byPriority || {}).map(([name, value]) => ({
        name,
        Tasks: value,
        color: PRIORITY_COLORS[name] || '#64748b',
      }))
    : [];

  return (
    <PageShell
      title="Team Performance Dashboard"
      subtitle="Real-time analytics, task progress distribution, workload capacity, and member performance metrics"
    >
      <div className="space-y-4 pb-8">
        {/* Top Control Bar matching app style */}
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/users?tab=teams')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-gray-100 transition-colors"
              title="Back to Teams"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Team:
              </span>
              <select
                value={selectedTeamId}
                onChange={(e) => handleSelectTeam(e.target.value)}
                disabled={teamsLoading || teams.length === 0}
                className="input-field text-sm font-semibold min-w-[200px]"
              >
                {teams.length === 0 ? (
                  <option value="">No teams available</option>
                ) : (
                  teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.memberIds?.length || 0} members)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboardData(selectedTeamId)}
              disabled={loading || !selectedTeamId}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportData}
              disabled={loading || !data}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Content Loading & Error States */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : data ? (
          <>
            {/* Team Info Banner */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  <UsersRound className="w-4 h-4" />
                  Team Overview
                </div>
                <h1 className="text-xl font-bold text-slate-800">{data.team.name}</h1>
                {data.team.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{data.team.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {data.team.lead && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-lg text-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <div>
                      <span className="text-[10px] text-amber-600 uppercase font-semibold block">
                        Lead
                      </span>
                      <span className="font-semibold text-slate-800">{data.team.lead.name}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Members
                    </span>
                    <span className="font-semibold text-slate-800">
                      {data.team.memberCount} Members
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Stat Cards Strip matching app design system */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Total Tasks */}
              <div className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                    Total Tasks
                  </span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">
                  {data.statistics.totalTasks}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">All team tasks</div>
              </div>

              {/* Completion Rate */}
              <div className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-emerald-600">
                    Completion Rate
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {data.statistics.completionRate}%
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(data.statistics.completionRate, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Active In Progress */}
              <div className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-sky-600">
                    In Progress
                  </span>
                  <Clock className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-2xl font-bold text-sky-600 tabular-nums">
                  {data.statistics.inProgressTasks}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Active workload</div>
              </div>

              {/* Overdue */}
              <div className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-rose-600">
                    Overdue
                  </span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-600 tabular-nums">
                  {data.statistics.overdueTasks}
                </div>
                <div className="text-[10px] text-rose-500 font-medium mt-0.5">Needs action</div>
              </div>

              {/* 30-Day Velocity */}
              <div className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-indigo-600">
                    30d Completed
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-indigo-600 tabular-nums">
                  {data.statistics.completedLast30Days}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Recent velocity</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Task Status Distribution */}
              <div className="card">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Status Distribution
                </div>

                {statusPieData.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 italic">
                    No status data recorded
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Priority Breakdown Bar Chart */}
              <div className="card">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Priority Breakdown
                </div>

                {priorityBarData.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 italic">
                    No priority data recorded
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityBarData}>
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="Tasks" radius={[4, 4, 0, 0]}>
                          {priorityBarData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Member Performance Breakdown */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-primary" />
                Member Workload & Performance
              </div>

              {data.memberPerformance.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No member activity data available for this team.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="pb-2 px-2">Member</th>
                        <th className="pb-2 px-2 text-center">Total</th>
                        <th className="pb-2 px-2 text-center">Completed</th>
                        <th className="pb-2 px-2 text-center">In Progress</th>
                        <th className="pb-2 px-2 text-center">Pending</th>
                        <th className="pb-2 px-2 text-center">Overdue</th>
                        <th className="pb-2 px-2 text-right">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {data.memberPerformance.map((mp) => (
                        <tr key={mp.member._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                                {mp.member.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">{mp.member.name}</div>
                                <div className="text-[10px] text-slate-400">{mp.member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800 tabular-nums">
                            {mp.totalTasks}
                          </td>
                          <td className="py-2.5 px-2 text-center text-emerald-600 font-bold tabular-nums">
                            {mp.completedTasks}
                          </td>
                          <td className="py-2.5 px-2 text-center text-sky-600 font-bold tabular-nums">
                            {mp.inProgressTasks}
                          </td>
                          <td className="py-2.5 px-2 text-center text-amber-600 font-bold tabular-nums">
                            {mp.pendingTasks}
                          </td>
                          <td className="py-2.5 px-2 text-center text-rose-600 font-bold tabular-nums">
                            {mp.overdueTasks}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                mp.completionRate >= 75
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : mp.completionRate >= 40
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {mp.completionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Team Activity
              </div>

              {data.recentTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No recent activity recorded for this team.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentTasks.map((t) => (
                    <div
                      key={t._id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs hover:bg-gray-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            t.status === 'Completed'
                              ? 'bg-emerald-500'
                              : t.status === 'In Progress'
                              ? 'bg-sky-500'
                              : 'bg-amber-500'
                          }`}
                        ></div>
                        <Link
                          to={`/tasks/${t._id}`}
                          className="font-semibold text-slate-800 hover:text-primary transition-colors truncate max-w-[280px]"
                        >
                          {t.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-slate-700">
                          {t.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-slate-700">
                          {t.status}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          {t.assignedTo?.name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
