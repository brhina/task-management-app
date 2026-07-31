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
import { apiPaths } from '../../utils/apiPaths';
import api from '../../utils/axios';
import PageShell from '../../components/common/PageShell';
import KpiStatCard from '../../components/analytics/KpiStatCard';
import StatusDistributionChart from '../../components/analytics/StatusDistributionChart';
import PriorityBreakdownChart from '../../components/analytics/PriorityBreakdownChart';

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

  return (
    <PageShell
      title="Team Performance Dashboard"
      subtitle="Real-time analytics, task progress distribution, workload capacity, and member performance metrics"
    >
      <div className="space-y-4 pb-8">
        {/* Top Control Bar matching app style */}
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2">
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

            {/* KPI Stat Cards Strip using shared component */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiStatCard
                title="Total Tasks"
                value={data.statistics.totalTasks}
                icon={Layers}
                subtext="All team tasks"
                colorTheme="slate"
              />

              <KpiStatCard
                title="Completion Rate"
                value={`${data.statistics.completionRate}%`}
                icon={CheckCircle2}
                progressBarValue={data.statistics.completionRate}
                subtext="Completion %"
                colorTheme="emerald"
              />

              <KpiStatCard
                title="In Progress"
                value={data.statistics.inProgressTasks}
                icon={Clock}
                subtext="Active workload"
                colorTheme="sky"
              />

              <KpiStatCard
                title="Overdue"
                value={data.statistics.overdueTasks}
                icon={AlertTriangle}
                subtext="Needs action"
                colorTheme="rose"
              />

              <KpiStatCard
                title="30d Velocity"
                value={data.statistics.completedLast30Days}
                icon={TrendingUp}
                subtext="Recent velocity"
                colorTheme="indigo"
              />
            </div>

            {/* Charts Section using shared analytics components */}
            <div className="grid lg:grid-cols-2 gap-4">
              <StatusDistributionChart
                byStatus={data.statistics.byStatus}
                title="Status Distribution"
              />
              <PriorityBreakdownChart
                byPriority={data.statistics.byPriority}
                title="Priority Breakdown"
              />
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
                        <th className="pb-2 px-2 text-right">Actions</th>
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
                            <Link
                              to={`/users/${mp.member._id}/performance`}
                              className="text-[11px] font-semibold text-primary hover:text-primary-hover hover:underline"
                            >
                              View Member →
                            </Link>
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
