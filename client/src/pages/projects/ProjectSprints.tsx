import { useCallback, useEffect, useState, useContext, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Plus,
  Target,
  GanttChart,
  Folder,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Edit2,
  Trash2,
  ChevronRight,
  Filter,
  Search,
  Zap,
  TrendingUp,
  LayoutGrid,
  ListTodo,
  Layers,
  MessageSquareText,
  X,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import StatCard from '../../components/common/StatCard';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { Milestone, Sprint, Task } from '../../types';
import SprintModal from '../../components/sprints/SprintModal';
import MilestoneModal from '../../components/milestones/MilestoneModal';

export default function ProjectSprints() {
  const { hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();

  const [projectName, setProjectName] = useState<string>('Project');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [activeTab, setActiveTab] = useState<'sprints' | 'milestones' | 'backlog'>('sprints');

  // Modals state
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Retrospective inline editing state
  const [selectedRetroSprintId, setSelectedRetroSprintId] = useState<string | null>(null);
  const [retroText, setRetroText] = useState('');
  const [savingRetro, setSavingRetro] = useState(false);

  // Backlog filter
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogFilter, setBacklogFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [pRes, sRes, mRes, tRes] = await Promise.all([
        api.get(apiPaths.PROJECTS.GET_BY_ID.replace(':id', id)),
        api.get(apiPaths.SPRINTS.LIST, { params: { projectId: id } }),
        api.get(apiPaths.MILESTONES.LIST, { params: { projectId: id } }),
        api.get(apiPaths.TASKS.GET_ALL_TASKS, {
          params: { projectId: id, topLevel: 'true', limit: 150 },
        }),
      ]);

      const proj = pRes.data.data?.project || pRes.data.data;
      setProjectName(proj?.name || 'Project');
      setSprints(sRes.data.data || []);
      setMilestones(mRes.data.data || []);
      setTasks(tRes.data.data?.tasks || []);
    } catch (err) {
      console.error('Error loading sprints/milestones data:', err);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute metrics for Header KPI Summary Strip
  const stats = useMemo(() => {
    const activeSprint = sprints.find((s) => s.status === 'Active');
    const completedSprintsCount = sprints.filter((s) => s.status === 'Completed').length;

    // Upcoming milestones sorted by target date
    const upcomingMilestones = milestones
      .filter((m) => m.status !== 'Completed')
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    const nextMilestone = upcomingMilestones[0];

    // Compute total tasks and effort assigned to sprints
    const totalSprintTasks = tasks.filter((t) => t.sprintId);
    const completedSprintTasks = totalSprintTasks.filter((t) => t.status === 'Completed');
    const sprintCompletionRate = totalSprintTasks.length > 0
      ? Math.round((completedSprintTasks.length / totalSprintTasks.length) * 100)
      : 0;

    return {
      activeSprint,
      totalSprints: sprints.length,
      completedSprintsCount,
      nextMilestone,
      totalMilestones: milestones.length,
      sprintCompletionRate,
      unassignedTasksCount: tasks.filter((t) => !t.sprintId).length,
    };
  }, [sprints, milestones, tasks]);

  // Helper map: compute stats per sprint
  const sprintTaskStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; effortHours: number }>();
    for (const s of sprints) {
      map.set(s._id, { total: 0, completed: 0, effortHours: 0 });
    }
    for (const t of tasks) {
      if (t.sprintId && map.has(t.sprintId)) {
        const curr = map.get(t.sprintId)!;
        curr.total += 1;
        if (t.status === 'Completed') curr.completed += 1;
        curr.effortHours += t.effortHours || 0;
      }
    }
    return map;
  }, [sprints, tasks]);

  // Actions for Sprint
  const handleOpenCreateSprint = () => {
    setEditingSprint(null);
    setShowSprintModal(true);
  };

  const handleOpenEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setShowSprintModal(true);
  };

  const handleUpdateSprintStatus = async (sprintId: string, newStatus: Sprint['status']) => {
    try {
      await api.put(apiPaths.SPRINTS.UPDATE.replace(':id', sprintId), { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to update sprint status:', err);
    }
  };

  // Actions for Milestone
  const handleOpenCreateMilestone = () => {
    setEditingMilestone(null);
    setShowMilestoneModal(true);
  };

  const handleOpenEditMilestone = (m: Milestone) => {
    setEditingMilestone(m);
    setShowMilestoneModal(true);
  };

  const handleUpdateMilestoneStatus = async (mId: string, newStatus: Milestone['status']) => {
    try {
      await api.put(apiPaths.MILESTONES.UPDATE.replace(':id', mId), { status: newStatus });
      await loadData();
    } catch (err) {
      console.error('Failed to update milestone status:', err);
    }
  };

  // Retrospective notes
  const toggleRetro = (sprint: Sprint) => {
    if (selectedRetroSprintId === sprint._id) {
      setSelectedRetroSprintId(null);
    } else {
      setSelectedRetroSprintId(sprint._id);
      setRetroText(sprint.retrospectiveNotes || '');
    }
  };

  const saveRetroNotes = async (sprintId: string) => {
    setSavingRetro(true);
    try {
      await api.put(apiPaths.SPRINTS.UPDATE.replace(':id', sprintId), {
        retrospectiveNotes: retroText,
      });
      await loadData();
      setSelectedRetroSprintId(null);
    } catch (err) {
      console.error('Failed to save retro notes:', err);
    } finally {
      setSavingRetro(false);
    }
  };

  // Assign task to sprint / milestone
  const handleAssignTaskSprint = async (taskId: string, sprintId: string | null) => {
    try {
      if (!sprintId) {
        await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', taskId), { sprintId: null });
      } else {
        await api.put(apiPaths.SPRINTS.TASKS.replace(':id', sprintId), { taskIds: [taskId] });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to assign task to sprint:', err);
    }
  };

  // Helper date calculations
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    return `${diff} days left`;
  };

  const filteredBacklogTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(backlogSearch.toLowerCase());
      if (backlogFilter === 'unassigned') return matchesSearch && !t.sprintId;
      if (backlogFilter === 'assigned') return matchesSearch && Boolean(t.sprintId);
      return matchesSearch;
    });
  }, [tasks, backlogSearch, backlogFilter]);

  return (
    <PageShell
      title={`Sprints & Milestones — ${projectName}`}
      subtitle="Plan agile iterations, track strategic deliverable milestones, and manage capacity"
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-cyan-600 hover:bg-cyan-50 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={handleOpenCreateSprint}
            disabled={!hasPermission('project:update')}
          >
            <Plus className="w-4 h-4 text-cyan-600" />
            New Sprint
          </button>
          <button
            type="button"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={handleOpenCreateMilestone}
            disabled={!hasPermission('project:update')}
          >
            <Target className="w-4 h-4 text-amber-600" />
            New Milestone
          </button>
          <Link
            to={`/projects/${id}/gantt`}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <GanttChart className="w-4 h-4 text-slate-500" />
            Gantt Timeline
          </Link>
          <Link
            to="/projects"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Folder className="w-4 h-4 text-slate-500" />
            All Projects
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard
            title="Active Sprint"
            value={stats.activeSprint ? stats.activeSprint.name : 'No Active Sprint'}
            icon={Zap}
            colorTheme="cyan"
            subtext={
              stats.activeSprint
                ? getDaysRemaining(stats.activeSprint.endDate)
                : 'Plan & activate a sprint'
            }
          />

          <StatCard
            title="Sprint Progress"
            value={`${stats.sprintCompletionRate}%`}
            icon={TrendingUp}
            colorTheme="emerald"
            progressBarValue={stats.sprintCompletionRate}
            subtext={`${stats.completedSprintsCount} of ${stats.totalSprints} sprints completed`}
          />

          <StatCard
            title="Next Milestone"
            value={stats.nextMilestone ? stats.nextMilestone.title : 'None Pending'}
            icon={Target}
            colorTheme="amber"
            subtext={
              stats.nextMilestone
                ? `Target: ${new Date(stats.nextMilestone.targetDate).toLocaleDateString()} (${stats.totalMilestones} total)`
                : `${stats.totalMilestones} total milestones`
            }
          />

          <StatCard
            title="Unassigned Backlog"
            value={stats.unassignedTasksCount}
            icon={ListTodo}
            colorTheme="indigo"
            subtext="Tasks ready for sprint assignment"
            onClick={() => setActiveTab('backlog')}
          />
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('sprints')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'sprints'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Sprints ({sprints.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'milestones'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Target className="w-4 h-4 text-amber-500" />
              Milestones ({milestones.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backlog')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'backlog'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              Backlog & Assignment
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'sprints' && (
              <button
                type="button"
                className="btn-primary text-xs flex items-center gap-1.5"
                onClick={handleOpenCreateSprint}
                disabled={!hasPermission('project:update')}
              >
                <Plus className="w-4 h-4" /> New Sprint
              </button>
            )}
            {activeTab === 'milestones' && (
              <button
                type="button"
                className="btn-primary text-xs flex items-center gap-1.5"
                onClick={handleOpenCreateMilestone}
                disabled={!hasPermission('project:update')}
              >
                <Plus className="w-4 h-4" /> New Milestone
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SPRINTS OVERVIEW */}
        {activeTab === 'sprints' && (
          <div className="space-y-4">
            {sprints.length === 0 ? (
              <div className="card text-center py-12">
                <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Sprints Created Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Create your first agile sprint to group tasks into timed iterations and track team velocity.
                </p>
                <button
                  type="button"
                  className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
                  onClick={handleOpenCreateSprint}
                  disabled={!hasPermission('project:update')}
                >
                  <Plus className="w-4 h-4" /> Create First Sprint
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sprints.map((s) => {
                  const info = sprintTaskStats.get(s._id) || { total: 0, completed: 0, effortHours: 0 };
                  const capacity = s.capacityHours || 80;
                  const loadPct = Math.round((info.effortHours / capacity) * 100);
                  const isOverloaded = info.effortHours > capacity;
                  const taskProgressPct = info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;

                  return (
                    <div
                      key={s._id}
                      className={`card hover:shadow-md transition-all flex flex-col justify-between border-t-4 ${
                        s.status === 'Active'
                          ? 'border-t-cyan-500 ring-1 ring-cyan-500/20'
                          : s.status === 'Completed'
                          ? 'border-t-emerald-500'
                          : s.status === 'Cancelled'
                          ? 'border-t-rose-400'
                          : 'border-t-slate-300'
                      }`}
                    >
                      <div>
                        {/* Header & Status */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-800">{s.name}</h3>
                              <span
                                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                                  s.status === 'Active'
                                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                                    : s.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : s.status === 'Cancelled'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {s.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                              </span>
                              <span>·</span>
                              <span className="font-medium text-slate-600">{getDaysRemaining(s.endDate)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEditSprint(s)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Sprint"
                            disabled={!hasPermission('project:update')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Metrics Bar: Task Progress & Workload Capacity */}
                        <div className="space-y-3 my-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {/* Task completion progress */}
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-600 font-medium">Task Progress</span>
                              <span className="font-semibold text-slate-700">
                                {info.completed} / {info.total} tasks ({taskProgressPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-cyan-600 h-2 rounded-full transition-all"
                                style={{ width: `${taskProgressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Workload Capacity Meter */}
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-slate-600 font-medium flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Capacity Allocation
                              </span>
                              <span
                                className={`font-semibold ${
                                  isOverloaded ? 'text-rose-600 flex items-center gap-1' : 'text-slate-700'
                                }`}
                              >
                                {isOverloaded && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 inline" />}
                                {info.effortHours} / {capacity} hrs ({loadPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isOverloaded ? 'bg-rose-500' : loadPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, loadPct)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Retrospective Section */}
                        {selectedRetroSprintId === s._id ? (
                          <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                            <label className="block text-xs font-semibold text-amber-900 flex items-center gap-1">
                              <MessageSquareText className="w-3.5 h-3.5 text-amber-600" />
                              Sprint Retrospective Notes
                            </label>
                            <textarea
                              className="input-field w-full text-xs bg-white"
                              rows={3}
                              value={retroText}
                              onChange={(e) => setRetroText(e.target.value)}
                              placeholder="What went well? What could be improved? Action items..."
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn-secondary text-xs py-1 px-2.5"
                                onClick={() => setSelectedRetroSprintId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn-primary text-xs py-1 px-2.5"
                                onClick={() => saveRetroNotes(s._id)}
                                disabled={savingRetro || !hasPermission('project:update')}
                              >
                                {savingRetro ? 'Saving...' : 'Save Notes'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          s.retrospectiveNotes && (
                            <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                              <span className="font-semibold text-slate-700 block mb-0.5">Retro Notes:</span>
                              <p className="whitespace-pre-wrap italic">{s.retrospectiveNotes}</p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Footer Quick Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/sprints/${s._id}/board`}
                            className="px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" /> Sprint Board
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleRetro(s)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
                            Retro
                          </button>
                        </div>

                        {/* Status Transition Quick Buttons */}
                        {hasPermission('project:update') && (
                          <div className="flex items-center gap-1">
                            {s.status === 'Planned' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSprintStatus(s._id, 'Active')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" /> Start Sprint
                              </button>
                            )}
                            {s.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSprintStatus(s._id, 'Completed')}
                                className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 text-purple-600" /> Complete Sprint
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MILESTONES ROADMAP */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            {milestones.length === 0 ? (
              <div className="card text-center py-12">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Milestones Set</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Set strategic target dates and group key deliverables to measure major project achievements.
                </p>
                <button
                  type="button"
                  className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
                  onClick={handleOpenCreateMilestone}
                  disabled={!hasPermission('project:update')}
                >
                  <Plus className="w-4 h-4" /> Create First Milestone
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {milestones.map((m) => {
                  const linkedTasks = tasks.filter((t) => (m.taskIds || []).includes(t._id as any));
                  const completedTasksCount = linkedTasks.filter((t) => t.status === 'Completed').length;
                  const progressPct = m.progress ?? (linkedTasks.length > 0 ? Math.round((completedTasksCount / linkedTasks.length) * 100) : 0);

                  const isCompleted = m.status === 'Completed';
                  const isAtRisk = m.status === 'At Risk';

                  return (
                    <div
                      key={m._id}
                      className={`card hover:shadow-md transition-all border-l-4 ${
                        isCompleted
                          ? 'border-l-emerald-500'
                          : isAtRisk
                          ? 'border-l-rose-500'
                          : m.status === 'In Progress'
                          ? 'border-l-cyan-500'
                          : 'border-l-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800">{m.title}</h3>
                            <select
                              value={m.status}
                              onChange={(e) => handleUpdateMilestoneStatus(m._id, e.target.value as any)}
                              disabled={!hasPermission('project:update')}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : isAtRisk
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : m.status === 'In Progress'
                                  ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="Planned">Planned</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="At Risk">At Risk</option>
                            </select>
                          </div>
                          {m.description && (
                            <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditMilestone(m)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Milestone"
                          disabled={!hasPermission('project:update')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Milestone Target Date & Progress */}
                      <div className="space-y-2 my-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            Target: {new Date(m.targetDate).toLocaleDateString()}
                          </span>
                          <span className="font-semibold text-slate-700">{progressPct}% Complete</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? 'bg-emerald-500' : isAtRisk ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Linked Deliverable Tasks */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                          <span className="font-medium text-slate-600">Linked Deliverables</span>
                          <span>{linkedTasks.length} tasks</span>
                        </div>
                        {linkedTasks.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No tasks linked to this milestone yet.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {linkedTasks.map((t) => (
                              <span
                                key={t._id}
                                className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  t.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {t.status === 'Completed' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                <span className="truncate max-w-[150px]">{t.title}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BACKLOG & SPRINT/MILESTONE TASK ASSIGNMENT */}
        {activeTab === 'backlog' && (
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Task Allocation Matrix</h3>
                <p className="text-xs text-slate-500">
                  Assign project backlog tasks into active or upcoming sprints and monitor effort hours
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter tasks..."
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
                  />
                  {backlogSearch && (
                    <button
                      type="button"
                      onClick={() => setBacklogSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBacklogFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                      backlogFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    All ({tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBacklogFilter('unassigned')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                      backlogFilter === 'unassigned' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Unassigned ({stats.unassignedTasksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBacklogFilter('assigned')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                      backlogFilter === 'assigned' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Assigned
                  </button>
                </div>
              </div>
            </div>

            {/* Backlog Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                    <th className="py-2.5 px-3">Task Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Effort (Hrs)</th>
                    <th className="py-2.5 px-3">Sprint Iteration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBacklogTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No tasks match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBacklogTasks.map((t) => {
                      const currentSprint = sprints.find((s) => s._id === t.sprintId);

                      return (
                        <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs truncate">
                            <Link to={`/tasks/${t._id}`} className="hover:text-cyan-600 truncate block">
                              {t.title}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                t.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.status === 'In Progress'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`font-semibold text-[10px] ${
                                t.priority === 'Critical' || t.priority === 'High'
                                  ? 'text-rose-600'
                                  : t.priority === 'Medium'
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {t.effortHours ? `${t.effortHours} hrs` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              className="input-field text-xs py-1"
                              value={t.sprintId || ''}
                              onChange={(e) => handleAssignTaskSprint(t._id, e.target.value || null)}
                              disabled={!hasPermission('task:assign')}
                            >
                              <option value="">Unassigned (Backlog)</option>
                              {sprints.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.status})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sprint Modal */}
      <SprintModal
        isOpen={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        onSuccess={loadData}
        projectId={id || ''}
        sprint={editingSprint}
        existingSprintsCount={sprints.length}
      />

      {/* Milestone Modal */}
      <MilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        onSuccess={loadData}
        projectId={id || ''}
        milestone={editingMilestone}
        availableTasks={tasks}
      />
    </PageShell>
  );
}
