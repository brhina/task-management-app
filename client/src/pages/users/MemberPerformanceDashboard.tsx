import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Download,
  Users,
  TrendingUp,
  Layers,
  Folder,
  Briefcase,
  Shield,
} from 'lucide-react';
import { apiPaths } from '../../utils/apiPaths';
import api from '../../utils/axios';
import PageShell from '../../components/common/PageShell';
import KpiStatCard from '../../components/analytics/KpiStatCard';
import StatusDistributionChart from '../../components/analytics/StatusDistributionChart';
import PriorityBreakdownChart from '../../components/analytics/PriorityBreakdownChart';
import RecentTaskActivityTree from '../../components/users/RecentTaskActivityTree';
import { UserContext } from '../../context/UserContext';

interface MemberPerformanceData {
  user: {
    _id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    role: string;
    teams: Array<{
      _id: string;
      name: string;
      description?: string;
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
    workloadStatus: string;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byProject: Array<{
      _id: string;
      projectName: string;
      total: number;
      completed: number;
    }>;
  };
  recentTasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    projectId?: {
      _id: string;
      name: string;
    };
    parentTaskId?: {
      _id?: string;
      title?: string;
      status?: string;
      priority?: string;
    } | string | null;
    updatedAt: string;
  }>;
}

export default function MemberPerformanceDashboard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(UserContext);

  const [members, setMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(id || currentUser?._id || '');
  const [data, setData] = useState<MemberPerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [membersLoading, setMembersLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Fetch list of members for user selector
  const fetchMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      const res = await api.get(apiPaths.USERS.GET_ALL_USERS);
      const userList = res.data.users || [];
      setMembers(userList);

      if (!id) {
        const defaultUser = userList.find((u: any) => u._id === currentUser?._id) || userList[0];
        if (defaultUser) {
          setSelectedUserId(defaultUser._id);
        }
      } else {
        setSelectedUserId(id);
      }
    } catch (err: any) {
      console.error('Failed to fetch members list:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [id, currentUser?._id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Fetch single member performance data
  const fetchPerformanceData = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.USERS.PERFORMANCE.replace(':id', userId));
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load member performance statistics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchPerformanceData(selectedUserId);
    }
  }, [selectedUserId, fetchPerformanceData]);

  const handleSelectMember = (newUserId: string) => {
    setSelectedUserId(newUserId);
    navigate(`/users/${newUserId}/performance`);
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
      `${data.user.name.toLowerCase().replace(/\s+/g, '_')}_performance_report.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <PageShell
      title="Member Performance Analytics"
      subtitle="Individual productivity metrics, task completion rates, project workloads, and activity insights"
    >
      <div className="space-y-4 pb-8">
        {/* Top Control Bar */}
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectMember(e.target.value)}
                disabled={membersLoading || members.length === 0}
                className="input-field text-sm font-semibold min-w-[220px]"
              >
                {members.length === 0 ? (
                  <option value="">No members available</option>
                ) : (
                  members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.email})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPerformanceData(selectedUserId)}
              disabled={loading || !selectedUserId}
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
            {/* Member Profile Header Banner */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20 shrink-0">
                  {data.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-800">{data.user.name}</h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Shield className="w-3 h-3 text-primary" />
                      {data.user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{data.user.email}</p>
                </div>
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Workload Status */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Workload Status
                    </span>
                    <span
                      className={`font-semibold text-xs ${
                        data.statistics.workloadStatus === 'Heavy'
                          ? 'text-rose-600'
                          : data.statistics.workloadStatus === 'Balanced'
                          ? 'text-emerald-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {data.statistics.workloadStatus}
                    </span>
                  </div>
                </div>

                {/* Teams List */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Assigned Teams
                    </span>
                    <span className="font-semibold text-slate-800">
                      {(data.user?.teams || []).length === 0
                        ? 'None'
                        : (data.user?.teams || []).map((t) => t.name).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Stat Cards Strip using reusable KpiStatCard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiStatCard
                title="Total Tasks"
                value={data.statistics.totalTasks}
                icon={Layers}
                subtext="Assigned tasks"
                colorTheme="slate"
              />

              <KpiStatCard
                title="Completion Rate"
                value={`${data.statistics.completionRate}%`}
                icon={CheckCircle2}
                progressBarValue={data.statistics.completionRate}
                subtext="Task completion %"
                colorTheme="emerald"
              />

              <KpiStatCard
                title="In Progress"
                value={data.statistics.inProgressTasks}
                icon={Clock}
                subtext="Active tasks"
                colorTheme="sky"
              />

              <KpiStatCard
                title="Overdue"
                value={data.statistics.overdueTasks}
                icon={AlertTriangle}
                subtext="Overdue tasks"
                colorTheme="rose"
              />

              <KpiStatCard
                title="30d Velocity"
                value={data.statistics.completedLast30Days}
                icon={TrendingUp}
                subtext="Done in last 30d"
                colorTheme="indigo"
              />
            </div>

            {/* Charts Section using shared analytics components */}
            <div className="grid lg:grid-cols-2 gap-4">
              <StatusDistributionChart
                byStatus={data.statistics.byStatus}
                title="Task Status Breakdown"
              />
              <PriorityBreakdownChart
                byPriority={data.statistics.byPriority}
                title="Task Priority Distribution"
              />
            </div>

            {/* Project Workload Breakdown Table */}
            <div className="card">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                Project Workload Breakdown
              </div>

              {(data.statistics?.byProject || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No project tasks assigned to this member.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="pb-2 px-2">Project</th>
                        <th className="pb-2 px-2 text-center">Total Assigned</th>
                        <th className="pb-2 px-2 text-center">Completed</th>
                        <th className="pb-2 px-2 text-right">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {data.statistics.byProject.map((proj) => {
                        const rate =
                          proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
                        return (
                          <tr key={proj._id || proj.projectName} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-2.5 px-2 font-semibold text-slate-800">
                              {proj.projectName}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-800 tabular-nums">
                              {proj.total}
                            </td>
                            <td className="py-2.5 px-2 text-center text-emerald-600 font-bold tabular-nums">
                              {proj.completed}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rate >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : rate >= 40
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Member Recent Task Activity */}
            <RecentTaskActivityTree
              tasks={data.recentTasks}
              title="Member Recent Task Activity"
              emptyMessage="No recent tasks found for this member."
              showAssignee={false}
            />
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
