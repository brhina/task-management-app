import { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ClipboardList,
  Timer,
  Folder,
  Plus,
  Target,
  Search,
  Calendar,
  Layers,
  ChevronRight,
  User as UserIcon,
  HelpCircle,
  X,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { Milestone, Sprint, Task } from '../../types';
import SprintModal from '../../components/sprints/SprintModal';
import MilestoneModal from '../../components/milestones/MilestoneModal';

interface GanttDep {
  fromTaskId: string | { _id: string };
  toTaskId: string | { _id: string };
  type?: string;
}

type TimeScale = 'day' | 'week' | 'month';

function dayMs(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function getDaysBetween(startMs: number, endMs: number) {
  return Math.max(1, Math.ceil((endMs - startMs) / 86400000));
}

export default function ProjectGantt() {
  const { hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();

  const [projectName, setProjectName] = useState('Project');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [deps, setDeps] = useState<GanttDep[]>([]);

  // Toolbar options
  const [timeScale, setTimeScale] = useState<TimeScale>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dragging state
  const [dragging, setDragging] = useState<{
    taskId: string;
    edge: 'start' | 'end';
  } | null>(null);

  // Modals state
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [gRes, sRes] = await Promise.all([
        api.get(apiPaths.PROJECTS.GANTT.replace(':id', id)),
        api.get(apiPaths.SPRINTS.LIST, { params: { projectId: id } }),
      ]);
      const data = gRes.data.data;
      setProjectName(data?.project?.name || data?.name || 'Project');
      setTasks(data.tasks || []);
      setMilestones(data.milestones || []);
      setDeps(data.dependencies || []);
      setSprints(sRes.data.data || []);
    } catch (err) {
      console.error('Failed to load Gantt data:', err);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute timeline boundaries and columns based on tasks & milestones
  const { rangeStart, totalDays, timeColumns } = useMemo(() => {
    const dates: number[] = [];
    for (const t of tasks) {
      if (t.startDate) dates.push(dayMs(new Date(t.startDate)));
      if (t.dueDate) dates.push(dayMs(new Date(t.dueDate)));
    }
    for (const m of milestones) {
      if (m.targetDate) dates.push(dayMs(new Date(m.targetDate)));
    }

    const nowMs = dayMs(new Date());
    dates.push(nowMs);

    const min = Math.min(...dates);
    const max = Math.max(...dates);

    // Padding
    const start = min - 3 * 86400000;
    const end = max + 5 * 86400000;
    const days = Math.max(14, Math.ceil((end - start) / 86400000));

    // Generate timeline headers
    const cols: { date: Date; dateMs: number; isWeekend: boolean; label: string }[] = [];
    for (let i = 0; i < days; i++) {
      const dMs = start + i * 86400000;
      const d = new Date(dMs);
      const dayOfWeek = d.getDay();
      cols.push({
        date: d,
        dateMs: dMs,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }

    return { rangeStart: start, totalDays: days, timeColumns: cols };
  }, [tasks, milestones]);

  // Helper percentage calculations
  const pct = (date: Date) => {
    const offset = (dayMs(date) - rangeStart) / 86400000;
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  };

  const widthPct = (start: Date, end: Date) => {
    const s = pct(start);
    const e = pct(end);
    return Math.max(1.2, e - s);
  };

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // Drag handles to adjust task dates
  const updateDates = async (taskId: string, startDate?: string, dueDate?: string) => {
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', taskId), {
        startDate,
        dueDate,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to update task dates:', err);
    }
  };

  const onBarMouseDown = (e: React.MouseEvent, taskId: string, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ taskId, edge });
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const el = document.getElementById('gantt-canvas');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const dayOffset = Math.round((x / rect.width) * totalDays);
      const date = new Date(rangeStart + dayOffset * 86400000);
      const iso = date.toISOString();

      setTasks((prev) =>
        prev.map((t) => {
          if (t._id !== dragging.taskId) return t;
          if (dragging.edge === 'start') {
            const currentDue = new Date(t.dueDate).getTime();
            if (date.getTime() >= currentDue) return t;
            return { ...t, startDate: iso };
          } else {
            const currentStart = new Date(t.startDate || t.dueDate).getTime();
            if (date.getTime() <= currentStart) return t;
            return { ...t, dueDate: iso };
          }
        })
      );
    };

    const onUp = async () => {
      const task = tasks.find((t) => t._id === dragging.taskId);
      setDragging(null);
      if (task) {
        await updateDates(task._id, task.startDate, task.dueDate);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, rangeStart, totalDays, tasks]);

  // Today position %
  const todayPct = pct(new Date());

  return (
    <PageShell
      title={`Gantt Chart — ${projectName}`}
      subtitle="Interactive timeline grid, task schedules, milestone diamonds, and drag-and-drop duration adjustments"
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-cyan-600 hover:bg-cyan-50 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={() => setShowSprintModal(true)}
            disabled={!hasPermission('project:update')}
          >
            <Plus className="w-4 h-4 text-cyan-600" />
            New Sprint
          </button>
          <button
            type="button"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={() => setShowMilestoneModal(true)}
            disabled={!hasPermission('project:update')}
          >
            <Target className="w-4 h-4 text-amber-600" />
            New Milestone
          </button>
          <Link
            to={`/tasks?projectId=${id}`}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Project Tasks
          </Link>
          <Link
            to={`/projects/${id}/sprints`}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Timer className="w-4 h-4 text-purple-600" />
            Agile Sprints
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
      <div className="space-y-4">
        {/* Toolbar & Controls Bar */}
        <div className="card flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Filter */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Gantt tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
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

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="gantt-status-filter" className="text-xs text-slate-500 font-medium whitespace-nowrap">Status:</label>
              <select
                id="gantt-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-xs py-1.5 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-cyan-600" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-400" />
              <span>To Do</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rotate-45 bg-amber-500" />
              <span>Milestone</span>
            </div>
          </div>
        </div>

        {/* Main Gantt Split Container */}
        <div className="card overflow-hidden p-0 border border-slate-200 shadow-sm flex flex-col">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[900px] flex">
              {/* Left Task Tree Column */}
              <div className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/50">
                {/* Header */}
                <div className="h-12 border-b border-slate-200 px-3 flex items-center justify-between font-semibold text-xs text-slate-600 bg-slate-100/70">
                  <span>Task Name</span>
                  <span className="text-[11px] text-slate-400 font-normal">Duration</span>
                </div>

                {/* Milestone Row Indicator */}
                <div className="h-9 border-b border-slate-200 px-3 bg-amber-50/60 flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  <span>Project Milestones ({milestones.length})</span>
                </div>

                {/* Task Tree Rows */}
                {filteredTasks.map((t) => {
                  const start = new Date(t.startDate || t.dueDate);
                  const end = new Date(t.dueDate);
                  const days = getDaysBetween(start.getTime(), end.getTime());
                  const assignedName = typeof t.assignedTo === 'object' && t.assignedTo ? t.assignedTo.name : '';

                  return (
                    <div
                      key={t._id}
                      className="h-9 border-b border-slate-100 px-3 flex items-center justify-between hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            t.status === 'Completed'
                              ? 'bg-emerald-500'
                              : t.status === 'In Progress'
                              ? 'bg-cyan-600'
                              : 'bg-slate-300'
                          }`}
                        />
                        <Link
                          to={`/tasks/${t._id}`}
                          className="text-xs font-medium text-slate-700 hover:text-cyan-600 truncate"
                          title={t.title}
                        >
                          {t.title}
                        </Link>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                        {days}d
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Interactive Canvas */}
              <div id="gantt-canvas" className="flex-1 relative bg-white min-w-[600px]">
                {/* Timeline Date Headers */}
                <div className="h-12 border-b border-slate-200 flex items-center text-[10px] text-slate-500 font-medium bg-slate-50 select-none">
                  {timeColumns.map((col, idx) => (
                    <div
                      key={col.dateMs}
                      className={`h-full border-r border-slate-100 flex items-center justify-center text-center shrink-0 ${
                        col.isWeekend ? 'bg-slate-100/60 font-semibold text-slate-400' : ''
                      }`}
                      style={{ width: `${100 / totalDays}%` }}
                    >
                      {idx % 2 === 0 ? col.label : ''}
                    </div>
                  ))}
                </div>

                {/* Today vertical line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }}
                  >
                    <span className="absolute top-0 -translate-x-1/2 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-b shadow-sm">
                      Today
                    </span>
                  </div>
                )}

                {/* Milestones Track Row */}
                <div className="h-9 border-b border-slate-200 relative bg-amber-50/30">
                  {milestones.map((m) => {
                    const left = pct(new Date(m.targetDate));
                    return (
                      <div
                        key={m._id}
                        title={`Milestone: ${m.title} (${new Date(m.targetDate).toLocaleDateString()})`}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group cursor-pointer"
                        style={{ left: `${left}%` }}
                      >
                        <div className="w-3.5 h-3.5 rotate-45 bg-amber-500 border border-amber-600 shadow-sm group-hover:scale-125 transition-transform" />
                        <div className="absolute left-1/2 -translate-x-1/2 -top-6 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow-lg z-30">
                          {m.title} · {new Date(m.targetDate).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tasks Timeline Bars */}
                {filteredTasks.map((t) => {
                  const start = new Date(t.startDate || t.dueDate);
                  const end = new Date(t.dueDate);
                  const left = pct(start);
                  const width = widthPct(start, end);
                  const progressPct = t.status === 'Completed' ? 100 : t.status === 'In Progress' ? 50 : 0;

                  return (
                    <div
                      key={t._id}
                      className="h-9 border-b border-slate-100 relative flex items-center hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Gantt Bar */}
                      <div
                        className={`absolute h-6 rounded-md shadow-sm border transition-shadow group flex items-center justify-between px-1 text-[10px] text-white overflow-hidden ${
                          t.status === 'Completed'
                            ? 'bg-emerald-600 border-emerald-700'
                            : t.status === 'In Progress'
                            ? 'bg-cyan-600 border-cyan-700'
                            : 'bg-slate-400 border-slate-500'
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${t.title} (${start.toLocaleDateString()} – ${end.toLocaleDateString()})`}
                      >
                        {/* Progress Fill inside Bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                          style={{ width: `${progressPct}%` }}
                        />

                        {/* Title text preview if wide enough */}
                        <span className="truncate px-1 font-medium z-10 select-none">
                          {width > 8 ? t.title : ''}
                        </span>

                        {/* Drag Handle Left */}
                        <button
                          type="button"
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-20"
                          onMouseDown={(e) => onBarMouseDown(e, t._id, 'start')}
                          disabled={!hasPermission('task:update')}
                          title="Drag to change Start Date"
                        />

                        {/* Drag Handle Right */}
                        <button
                          type="button"
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-20"
                          onMouseDown={(e) => onBarMouseDown(e, t._id, 'end')}
                          disabled={!hasPermission('task:update')}
                          title="Drag to change Due Date"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-cyan-50/60 border border-cyan-200/80 rounded-xl text-xs text-cyan-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              <strong>Tip:</strong> Drag the left or right edges of any task bar in the timeline to dynamically adjust start and due dates.
            </span>
          </div>
          {deps.length > 0 && (
            <span className="text-[11px] font-semibold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
              {deps.length} task dependencies tracked
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      <SprintModal
        isOpen={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        onSuccess={loadData}
        projectId={id || ''}
        existingSprintsCount={sprints.length}
      />

      <MilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        onSuccess={loadData}
        projectId={id || ''}
        availableTasks={tasks}
      />
    </PageShell>
  );
}
