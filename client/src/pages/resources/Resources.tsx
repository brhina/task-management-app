import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import StatCard from '../../components/common/StatCard';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Edit3,
  Search,
  Calendar,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  X,
  PieChart,
  Zap,
  ClipboardList,
  Layers,
  CornerDownRight,
} from 'lucide-react';

interface TaskSummary {
  _id: string;
  title: string;
  status: string;
  priority: string;
  effortHours: number;
  dueDate?: string;
  projectId?: { _id: string; name: string };
  parentTaskId?: any;
}

interface AllocationRow {
  userId: string;
  user?: { name: string; email: string; profileImageUrl?: string };
  role?: string;
  capacityHoursPerWeek: number;
  capacityInWindow: number;
  assignedHours: number;
  loggedHours: number;
  openTaskCount: number;
  overloaded: boolean;
  statusCategory: 'overloaded' | 'heavy' | 'optimal' | 'available';
  utilizationPercent: number;
  tasks?: TaskSummary[];
}

interface SummaryMetrics {
  totalCapacity: number;
  totalAssigned: number;
  totalLogged: number;
  overloadedCount: number;
  teamUtilization: number;
  totalMembers: number;
}

interface RebalanceSuggestion {
  overloadedUserId: string;
  overloadedUser?: { name: string; email: string };
  overloadHours: number;
  assignedHours: number;
  capacity: number;
  tasksCount: number;
  suggestedTargetUser?: { name: string; email: string };
  suggestedTargetAvailableHours: number;
}

export default function Resources() {
  const [allocation, setAllocation] = useState<AllocationRow[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState<RebalanceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Date Range State
  const [from, setFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overloaded' | 'heavy' | 'optimal' | 'available'>('all');

  // Modal States
  const [viewingTasksUser, setViewingTasksUser] = useState<AllocationRow | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<AllocationRow | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(40);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        api.get(apiPaths.RESOURCES.ALLOCATION, { params: { from, to } }),
        api.get(apiPaths.RESOURCES.CONFLICTS, { params: { from, to } }),
      ]);

      const aData = aRes.data.data;
      if (aData) {
        setAllocation(aData.allocation || []);
        setSummary(aData.summary || null);
      }

      const cData = cRes.data.data;
      if (cData) {
        setConflicts(cData.conflicts || []);
        setRebalanceSuggestions(cData.rebalanceSuggestions || []);
      }
    } catch (err) {
      console.error('Failed to load resource data:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Date Range Presets
  const setPresetRange = (days: number) => {
    const today = new Date();
    const past = new Date(today.getTime() - days * 86400000);
    setFrom(past.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  };

  const setFuturePresetRange = (days: number) => {
    const today = new Date();
    const future = new Date(today.getTime() + days * 86400000);
    setFrom(today.toISOString().slice(0, 10));
    setTo(future.toISOString().slice(0, 10));
  };

  // Capacity Save Handler
  const handleSaveCapacity = async () => {
    if (!editingUser) return;
    setSavingCapacity(true);
    setCapacityMessage(null);
    try {
      await api.put(
        apiPaths.RESOURCES.UPDATE_CAPACITY.replace(':userId', editingUser.userId),
        { capacityHoursPerWeek: newCapacity }
      );
      setEditingUser(null);
      load();
    } catch (err: any) {
      setCapacityMessage(err.response?.data?.message || 'Failed to update capacity');
    } finally {
      setSavingCapacity(false);
    }
  };

  // Filtered rows
  const filteredAllocation = useMemo(() => {
    return allocation.filter((row) => {
      const nameMatch =
        !searchQuery.trim() ||
        row.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch =
        statusFilter === 'all' || row.statusCategory === statusFilter;

      return nameMatch && statusMatch;
    });
  }, [allocation, searchQuery, statusFilter]);

  // Filtered Tasks inside Task Modal
  const modalFilteredTasks = useMemo(() => {
    if (!viewingTasksUser || !viewingTasksUser.tasks) return [];
    if (!taskSearchQuery.trim()) return viewingTasksUser.tasks;
    return viewingTasksUser.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        t.projectId?.name.toLowerCase().includes(taskSearchQuery.toLowerCase())
    );
  }, [viewingTasksUser, taskSearchQuery]);

  const getStatusBadge = (category: AllocationRow['statusCategory']) => {
    switch (category) {
      case 'overloaded':
        return {
          label: 'OVERLOADED',
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          barColor: 'bg-rose-500',
        };
      case 'heavy':
        return {
          label: 'HEAVY LOAD',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          barColor: 'bg-amber-500',
        };
      case 'optimal':
        return {
          label: 'OPTIMAL',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          barColor: 'bg-emerald-500',
        };
      case 'available':
      default:
        return {
          label: 'AVAILABLE',
          bg: 'bg-sky-100 text-sky-800 border-sky-200',
          barColor: 'bg-sky-500',
        };
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <PageShell
      title="Resource Workload & Capacity"
      subtitle="Monitor team capacity, track assigned vs logged hours, and resolve workload conflicts"
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            onClick={() => load()}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Resource Data
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Analytics Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Capacity"
              value={`${summary.totalCapacity.toFixed(1)} hrs`}
              icon={Clock}
              colorTheme="blue"
              subtext={`${summary.totalMembers} active team members`}
            />

            <StatCard
              title="Allocated Workload"
              value={`${summary.totalAssigned.toFixed(1)} hrs`}
              icon={PieChart}
              colorTheme="indigo"
              progressBarValue={summary.teamUtilization}
              subtext={`${summary.teamUtilization}% team utilization rate`}
            />

            <StatCard
              title="Actual Logged"
              value={`${summary.totalLogged.toFixed(1)} hrs`}
              icon={TrendingUp}
              colorTheme="emerald"
              subtext="Time entry logs in window"
            />

            <StatCard
              title="Workload Conflicts"
              value={summary.overloadedCount}
              icon={AlertTriangle}
              colorTheme={summary.overloadedCount > 0 ? "rose" : "slate"}
              subtext={
                summary.overloadedCount > 0
                  ? `${summary.overloadedCount} member(s) over capacity`
                  : "All members within capacity"
              }
            />
          </div>
        )}

        {/* Date Presets & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Date Picker & Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setPresetRange(7)}
                className="px-2.5 py-1 rounded-lg bg-white shadow-xs hover:bg-slate-50 transition-colors"
              >
                Past 7d
              </button>
              <button
                type="button"
                onClick={() => setFuturePresetRange(7)}
                className="px-2.5 py-1 rounded-lg bg-white shadow-xs hover:bg-slate-50 transition-colors"
              >
                Next 7d
              </button>
              <button
                type="button"
                onClick={() => setFuturePresetRange(14)}
                className="px-2.5 py-1 rounded-lg bg-white shadow-xs hover:bg-slate-50 transition-colors"
              >
                Next 14d
              </button>
              <button
                type="button"
                onClick={() => setFuturePresetRange(30)}
                className="px-2.5 py-1 rounded-lg bg-white shadow-xs hover:bg-slate-50 transition-colors"
              >
                30 Days
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative min-w-[200px] flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="all">All Workloads</option>
              <option value="overloaded">Overloaded (&gt;100%)</option>
              <option value="heavy">Heavy (85-100%)</option>
              <option value="optimal">Optimal (50-84%)</option>
              <option value="available">Available (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* Conflict & Smart Rebalancing Assistant */}
        {rebalanceSuggestions.length > 0 && (
          <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  {rebalanceSuggestions.length} Member(s) Exceeding Workload Capacity
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Over-allocation detected. Consider reassigning open tasks to available team members.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {rebalanceSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-xs text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{sug.overloadedUser?.name}</span>
                    <span className="px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-700">
                      +{sug.overloadHours.toFixed(1)}h Overload
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Assigned <strong>{sug.assignedHours.toFixed(1)}h</strong> out of{' '}
                    <strong>{sug.capacity.toFixed(1)}h</strong> capacity ({sug.tasksCount} open tasks).
                  </div>

                  {sug.suggestedTargetUser ? (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-950">
                      <span className="flex items-center gap-1 font-medium">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        Suggest Reassign to: <strong>{sug.suggestedTargetUser.name}</strong>
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {sug.suggestedTargetAvailableHours.toFixed(1)}h free
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      No alternate team member with free capacity in this window.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource Allocation Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Team Member</th>
                  <th className="py-3.5 px-4">Weekly Capacity</th>
                  <th className="py-3.5 px-4">Window Cap</th>
                  <th className="py-3.5 px-4">Assigned Effort</th>
                  <th className="py-3.5 px-4">Logged Hours</th>
                  <th className="py-3.5 px-4">Workload Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredAllocation.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No resource allocation records match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAllocation.map((row) => {
                    const badge = getStatusBadge(row.statusCategory);
                    return (
                      <tr key={row.userId} className="group hover:bg-slate-50/60 transition-colors">
                        {/* Member Column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {row.user?.profileImageUrl ? (
                              <img
                                src={row.user.profileImageUrl}
                                alt={row.user.name}
                                className="w-8 h-8 rounded-full object-cover border shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                {row.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                            )}

                            <div>
                              <div className="font-semibold text-slate-800">{row.user?.name || 'User'}</div>
                              <div className="text-[11px] text-slate-400">{row.user?.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Capacity / Wk Column */}
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-2">
                            <span>{row.capacityHoursPerWeek} hrs/wk</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(row);
                                setNewCapacity(row.capacityHoursPerWeek);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                              title="Edit Capacity"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Window Capacity */}
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {row.capacityInWindow.toFixed(1)} hrs
                        </td>

                        {/* Assigned Effort */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {row.assignedHours.toFixed(1)} hrs
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {row.openTaskCount} open tasks
                          </span>
                        </td>

                        {/* Logged Hours */}
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {row.loggedHours.toFixed(1)} hrs
                        </td>

                        {/* Workload Status Bar */}
                        <td className="py-3.5 px-4 min-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="font-extrabold text-slate-700 tabular-nums">
                                {row.utilizationPercent}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${badge.barColor}`}
                                style={{ width: `${Math.min(100, row.utilizationPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* View Tasks Modal Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingTasksUser(row);
                              setTaskSearchQuery('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-xl transition-all shadow-2xs"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            View Tasks ({row.openTaskCount})
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: VIEW ASSIGNED TASKS MODAL */}
      {viewingTasksUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {viewingTasksUser.user?.profileImageUrl ? (
                  <img
                    src={viewingTasksUser.user.profileImageUrl}
                    alt={viewingTasksUser.user.name}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center font-bold text-cyan-700 text-sm">
                    {viewingTasksUser.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Assigned Tasks for {viewingTasksUser.user?.name}
                  </h3>
                  <p className="text-xs text-slate-500">{viewingTasksUser.user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingTasksUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Metric Pill */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 block text-[10px]">Open Tasks</span>
                  <strong className="font-extrabold text-slate-800">{viewingTasksUser.openTaskCount} tasks</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Effort</span>
                  <strong className="font-extrabold text-slate-800">{viewingTasksUser.assignedHours.toFixed(1)} hrs</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Window Capacity</span>
                  <strong className="font-extrabold text-slate-800">{viewingTasksUser.capacityInWindow.toFixed(1)} hrs</strong>
                </div>
              </div>

              {/* Status Badge */}
              {(() => {
                const b = getStatusBadge(viewingTasksUser.statusCategory);
                return (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${b.bg}`}>
                    {b.label} ({viewingTasksUser.utilizationPercent}%)
                  </span>
                );
              })()}
            </div>

            {/* Task Search Bar inside Modal */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter assigned tasks by title or project..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTaskSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tasks List Content */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {modalFilteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {taskSearchQuery ? 'No tasks match your search filter.' : 'No open tasks assigned to this team member.'}
                </div>
              ) : (
                modalFilteredTasks.map((t) => (
                  <div
                    key={t._id}
                    className={`p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${t.parentTaskId ? 'ml-4 pl-3 border-l-2 border-indigo-400/40 bg-slate-50/50' : ''}`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.parentTaskId && (
                          <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                        {t.parentTaskId && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider shrink-0">
                            Subtask
                          </span>
                        )}
                        <span className="font-bold text-xs text-slate-800 truncate">{t.title}</span>
                        {t.projectId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {t.projectId.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-600">Status: {t.status}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold border ${getPriorityBadgeClass(t.priority)}`}>
                          {t.priority || 'Normal'}
                        </span>
                        {t.dueDate && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-extrabold text-xs text-slate-700 border border-slate-200">
                        {t.effortHours || 0} hrs
                      </span>
                      <Link
                        to={
                          t.parentTaskId
                            ? `/tasks/${
                                typeof t.parentTaskId === 'object'
                                  ? (t.parentTaskId as any)._id
                                  : t.parentTaskId
                              }?subtaskId=${t._id}`
                            : `/tasks/${t._id}`
                        }
                        onClick={() => setViewingTasksUser(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold transition-colors"
                      >
                        Open
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTasksUser(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CAPACITY EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit Member Capacity</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                Adjust weekly capacity hours for <strong>{editingUser.user?.name}</strong>.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Weekly Capacity (Hours per Week)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Preset Shortcuts */}
              <div className="flex items-center gap-2">
                {[20, 30, 40, 45].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setNewCapacity(h)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      newCapacity === h
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {h} hrs
                  </button>
                ))}
              </div>

              {capacityMessage && (
                <p className="text-xs text-rose-600 font-semibold">{capacityMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCapacity}
                onClick={handleSaveCapacity}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {savingCapacity ? 'Saving…' : 'Save Capacity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
