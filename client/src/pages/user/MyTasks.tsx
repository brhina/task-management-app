import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { UserContext } from '../../context/UserContext';
import { usePageAssistant } from '../../hooks/usePageAssistant';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue, getRelativeTime } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import TaskBoard from '../../components/tasks/TaskBoard';
import TaskCard from '../../components/tasks/TaskCard';
import { ClipboardList, LayoutGrid, List } from 'lucide-react';
import type { Task, Project, TaskStatus } from '../../types';

interface StatusSummary {
  all: number;
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  {
    value: TASK_STATUS.PENDING,
    label: 'Pending',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  {
    value: TASK_STATUS.IN_PROGRESS,
    label: 'In Progress',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  {
    value: TASK_STATUS.IN_REVIEW,
    label: 'In Review',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  {
    value: TASK_STATUS.COMPLETED,
    label: 'Completed',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
];

function MyTasks() {
  const { user } = useContext(UserContext);
  usePageAssistant({ pageType: 'tasks', pageTitle: 'My Tasks' });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [projectFilter, setProjectFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status'>('dueDate');
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    all: 0,
    pending: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;
      const response = await api.get(apiPaths.TASKS.GET_ALL_TASKS, { params });
      setTasks(response.data.data.tasks);
      setStatusSummary(response.data.data.statusSummary);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, projectFilter]);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks]);

  const fetchProjects = async () => {
    try {
      const response = await api.get(apiPaths.PROJECTS.LIST);
      setProjects(response.data?.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId), {
        status: newStatus,
      });
      fetchTasks();
    } catch (err) {
      setError('Failed to update task status');
    }
  };

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (
          (order[a.priority as keyof typeof order] ?? 4) -
          (order[b.priority as keyof typeof order] ?? 4)
        );
      }
      const statusOrder = { Pending: 0, 'In Progress': 1, 'In Review': 2, Completed: 3 };
      return (
        (statusOrder[a.status as keyof typeof statusOrder] ?? 4) -
        (statusOrder[b.status as keyof typeof statusOrder] ?? 4)
      );
    });
  }, [tasks, searchTerm, sortBy]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = filteredTasks.find((t) => t._id === event.active.id);
      setActiveTask(task || null);
    },
    [filteredTasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      if (!over) return;

      const taskId = String(active.id);
      const newStatus = String(over.id) as TaskStatus;
      const task = filteredTasks.find((t) => t._id === taskId);

      if (task && task.status !== newStatus) {
        await handleStatusUpdate(taskId, newStatus);
      }
    },
    [filteredTasks, handleStatusUpdate]
  );

  if (!user) {
    return <PageShell title="Please Log In" subtitle="You need to be logged in." />;
  }

  return (
    <PageShell
      title="My Tasks"
      subtitle="Manage and track your assigned tasks"
      actions={
        <div className="flex gap-2">
          <Link to="/user/workos" className="btn-secondary">
            My WorkOS
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search by title or description..."
              filters={[
                {
                  id: 'projectFilter',
                  label: 'Project',
                  value: projectFilter,
                  onChange: setProjectFilter,
                  options: [
                    { value: '', label: 'All Projects' },
                    ...projects.map((p) => ({ value: p._id, label: p.name })),
                  ],
                },
              ]}
              actions={
                <button
                  type="button"
                  onClick={fetchTasks}
                  className="btn-secondary w-full md:w-auto text-sm py-2"
                >
                  Refresh
                </button>
              }
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input-dark text-xs py-1.5"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'board'
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading tasks..." />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">
              {tasks.length === 0
                ? 'No tasks assigned to you yet.'
                : 'No tasks match your filters.'}
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <TaskBoard
              tasks={filteredTasks}
              onTaskClick={(taskId) => navigate(`/user/task/${taskId}`)}
            />
            <DragOverlay>
              {activeTask ? (
                <div className="rotate-2 opacity-90">
                  <TaskCard task={activeTask} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="card !p-0 overflow-hidden">
            <div className="divide-y divide-slate-700/50">
              {filteredTasks.map((task) => {
                const daysLeft = getDaysUntilDue(task.dueDate);
                const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';

                return (
                  <div
                    key={task._id}
                    className="px-2 py-3 hover:bg-slate-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/user/task/${task._id}`}
                            className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors"
                          >
                            {task.title}
                          </Link>
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span
                            className={`inline-flex px-1.5 py-0.5 font-semibold rounded ${getStatusColor(task.status)}`}
                          >
                            {task.status}
                          </span>
                          {task.dueDate && (
                            <span className={overdue ? 'text-rose-400 font-medium' : ''}>
                              {overdue
                                ? `${Math.abs(daysLeft!)}d overdue`
                                : daysLeft === 0
                                  ? 'Due today'
                                  : `${daysLeft}d left`}
                            </span>
                          )}
                          {task.projectId && (
                            <span className="text-slate-600">
                              {projects.find(
                                (p) =>
                                  p._id ===
                                  (typeof task.projectId === 'string'
                                    ? task.projectId
                                    : task.projectId?._id)
                              )?.name || 'Project'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      {task.progress != null && task.progress > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums">
                            {task.progress}%
                          </span>
                        </div>
                      )}

                      {/* Quick Status */}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                        className="input-dark text-[10px] py-1 px-2 w-24 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <option value={TASK_STATUS.PENDING}>{TASK_STATUS.PENDING}</option>
                        <option value={TASK_STATUS.IN_PROGRESS}>{TASK_STATUS.IN_PROGRESS}</option>
                        <option value={TASK_STATUS.IN_REVIEW}>{TASK_STATUS.IN_REVIEW}</option>
                        <option value={TASK_STATUS.COMPLETED}>{TASK_STATUS.COMPLETED}</option>
                      </select>

                      <Link
                        to={`/user/task/${task._id}`}
                        className="text-[10px] text-primary hover:text-primary-hover font-medium shrink-0"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default MyTasks;
