import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
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
import { LayoutGrid, List, Users, ClipboardList, GanttChart, Timer, RefreshCw, Plus, Pencil, CornerDownRight } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import ConfirmModal from '../../components/common/ConfirmModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import TaskBoard from '../../components/tasks/TaskBoard';
import TaskCard from '../../components/tasks/TaskCard';
import UserDropZone from '../../components/tasks/UserDropZone';
import CreateTask from './CreateTask';
import { EditProjectModal } from '../projects/EditProject';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import { isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
import type { Task, User, TaskStatus, Project } from '../../types';

interface TaskWithAssignee extends Task {
  assignedTo: User & { profileImageUrl?: string };
}

interface StatusSummary {
  all: number;
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
}

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'All',
    color: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    dot: 'bg-slate-500',
  },
  {
    value: 'Pending',
    label: 'Pending',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  {
    value: 'In Progress',
    label: 'In Progress',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  {
    value: 'In Review',
    label: 'In Review',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-500',
  },
  {
    value: 'Completed',
    label: 'Completed',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
];

function ManageTasks() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId') || '';
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState(urlProjectId);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'assignee'>('dueDate');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    all: 0,
    pending: 0,
    inProgress: 0,
    inReview: 0,
    completed: 0,
  });

  const isProjectScoped = !!urlProjectId;
  const scopedProject = useMemo(
    () => projects.find((p) => p._id === urlProjectId),
    [projects, urlProjectId]
  );

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchProjects();
  }, [statusFilter, projectFilter]);

  // Live board updates from other users
  useEffect(() => {
    if (!socket) return;
    const onTaskUpdated = (payload: {
      taskId: string;
      action: string;
      task?: TaskWithAssignee;
    }) => {
      if (!payload.task) {
        fetchTasks();
        return;
      }
      const t = payload.task;
      if (projectFilter && String((t as any).projectId) !== projectFilter) {
        // still refresh summaries
        fetchTasks();
        return;
      }
      setTasks((prev) => {
        const idx = prev.findIndex((x) => x._id === payload.taskId);
        if (payload.action === 'created' && idx === -1) {
          return [t, ...prev];
        }
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...t };
        return next;
      });
    };
    socket.on('task_updated', onTaskUpdated);
    return () => {
      socket.off('task_updated', onTaskUpdated);
    };
  }, [socket, projectFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      params.topLevel = 'true';
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;
      const response = await api.get(apiPaths.TASKS.GET_ALL_TASKS, { params });
      setTasks(response.data.data.tasks);
      setStatusSummary(response.data.data.statusSummary);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get(apiPaths.USERS.GET_ALL_USERS);
      setUsers(response.data?.users || response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get(apiPaths.PROJECTS.LIST);
      setProjects(response.data?.data?.projects || []);
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

  const handleAssigneeUpdate = async (taskId: string, userId: string) => {
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK_ASSIGNEE.replace(':id', taskId), {
        assignedTo: userId,
      });
      fetchTasks();
    } catch (err) {
      setError('Failed to reassign task');
    }
  };

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    taskId: string;
    loading: boolean;
  }>({
    isOpen: false,
    taskId: '',
    loading: false,
  });

  const handleDeleteTask = (taskId: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      taskId,
      loading: false,
    });
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmModal.taskId) return;
    setDeleteConfirmModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(apiPaths.TASKS.DELETE_TASK.replace(':id', deleteConfirmModal.taskId));
      fetchTasks();
    } catch (err) {
      setError('Failed to delete task');
    } finally {
      setDeleteConfirmModal({ isOpen: false, taskId: '', loading: false });
    }
  };

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
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
      if (sortBy === 'assignee') {
        return (a.assignedTo?.name || '').localeCompare(b.assignedTo?.name || '');
      }
      const statusOrder = { Pending: 0, 'In Progress': 1, 'In Review': 2, Completed: 3 };
      return (
        (statusOrder[a.status as keyof typeof statusOrder] ?? 4) -
        (statusOrder[b.status as keyof typeof statusOrder] ?? 4)
      );
    });
  }, [tasks, searchTerm, sortBy]);

  const tasksByUser = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTasks.forEach((task) => {
      const id = task.assignedTo?._id;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [filteredTasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
      const overId = String(over.id);

      if (overId.startsWith('user-')) {
        const userId = overId.replace('user-', '');
        await handleAssigneeUpdate(taskId, userId);
        return;
      }

      const newStatus = overId as TaskStatus;
      const task = filteredTasks.find((t) => t._id === taskId);
      if (task && task.status !== newStatus) {
        await handleStatusUpdate(taskId, newStatus);
      }
    },
    [filteredTasks]
  );
  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title={isProjectScoped && scopedProject ? scopedProject.name : 'Manage Tasks'}
      subtitle={
        isProjectScoped ? 'Tasks for this project' : 'View and manage all tasks in the system'
      }
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            onClick={() => {
              fetchTasks();
              fetchProjects();
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Tasks
          </button>

          {isProjectScoped && scopedProject && (
            <>
              <button
                type="button"
                onClick={() => setEditingProjectId(scopedProject._id)}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4 text-slate-500" />
                Edit Project
              </button>

              <Link
                to={`/projects/${scopedProject._id}/gantt`}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
              >
                <GanttChart className="w-4 h-4 text-primary" />
                Gantt Timeline
              </Link>

              <Link
                to={`/projects/${scopedProject._id}/sprints`}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
              >
                <Timer className="w-4 h-4 text-purple-600" />
                Agile Sprints
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowCreateTask(true)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 text-primary" />
            Create Task
          </button>
        </div>
      }
    >
      <div className="space-y-4 overflow-hidden">
        {error && <div className="alert-error">{error}</div>}

        {/* Project Outcome Context Banner */}
        {isProjectScoped && scopedProject && (
          <div className="card bg-gradient-to-r from-primary/10 via-white to-sky-50/40 border border-primary/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {scopedProject.status} Project
                  </span>
                  <h2 className="text-base font-bold text-slate-800">{scopedProject.name}</h2>
                </div>
                <p className="text-xs text-slate-600">
                  {scopedProject.description || 'Targeted outcomes and deliverable tasks for this project.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/projects/${scopedProject._id}/gantt`}
                  className="btn btn-secondary text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <GanttChart className="w-3.5 h-3.5 text-primary" />
                  Gantt Timeline
                </Link>
                <Link
                  to={`/projects/${scopedProject._id}/sprints`}
                  className="btn btn-secondary text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Timer className="w-3.5 h-3.5 text-purple-600" />
                  Agile Sprints
                </Link>
                <Link
                  to="/projects"
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
                >
                  All Projects →
                </Link>
              </div>
            </div>
          </div>
        )}
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search by title, description, or assignee..."
              filters={[
                {
                  id: 'statusFilter',
                  label: 'Status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
                },
                ...(!isProjectScoped
                  ? [
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
                    ]
                  : []),
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input-field text-xs py-1.5"
            >
              <option value="dueDate">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="status">Sort: Status</option>
              <option value="assignee">Sort: Assignee</option>
            </select>

            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'board' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                sidebarOpen
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {sidebarOpen ? 'Hide' : 'Show'} Team
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">
              {tasks.length === 0
                ? 'No tasks yet. Create your first task to get started.'
                : 'No tasks match your filters.'}
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
              <div className="flex-1 min-w-0 overflow-x-hidden">
                <TaskBoard
                  tasks={filteredTasks}
                  onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)}
                />
              </div>
              {sidebarOpen && (
                <div className="hidden lg:block w-48 xl:w-56 shrink-0">
                  <div className="sticky top-4">
                    <div className="card p-3">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
                        Assign to
                      </h3>
                      <div className="space-y-1.5">
                        {users.map((u) => (
                          <UserDropZone key={u._id} user={u} taskCount={tasksByUser[u._id] || 0} />
                        ))}
                        {users.length === 0 && (
                          <div className="text-xs text-slate-500 text-center py-4">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="rotate-2 opacity-90">
                  <TaskCard task={activeTask} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          (() => {
            const taskColumns: Column<TaskWithAssignee>[] = [
              {
                key: 'title',
                header: 'Title',
                sortable: true,
                render: (task) => (
                  <div className={`flex items-center gap-2 ${task.parentTaskId ? 'pl-4' : ''}`}>
                    {task.parentTaskId && (
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                    {task.parentTaskId && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider shrink-0">
                        Subtask
                      </span>
                    )}
                    <Link
                      to={
                        task.parentTaskId
                          ? `/tasks/${
                              typeof task.parentTaskId === 'object'
                                ? (task.parentTaskId as any)._id
                                : task.parentTaskId
                            }?subtaskId=${task._id}`
                          : `/tasks/${task._id}`
                      }
                      className="text-sm font-medium text-slate-700 hover:text-primary truncate transition-colors"
                    >
                      {task.title}
                    </Link>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (task) => (
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                sortable: true,
                render: (task) => (
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                ),
              },
              {
                key: 'dueDate',
                header: 'Due Date',
                sortable: true,
                render: (task) => {
                  const daysLeft = getDaysUntilDue(task.dueDate);
                  const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';
                  return task.dueDate ? (
                    <span className={`text-xs ${overdue ? 'text-rose-400 font-medium' : 'text-slate-500'}`}>
                      {overdue ? `${Math.abs(daysLeft!)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  );
                },
              },
              {
                key: 'assignedTo',
                header: 'Assignee',
                sortable: true,
                render: (task) => (
                  <span className="text-sm text-slate-700">{task.assignedTo?.name || '—'}</span>
                ),
              },
              {
                key: 'progress',
                header: 'Progress',
                render: (task) => task.progress != null && task.progress > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums">{task.progress}%</span>
                  </div>
                ) : null,
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[50px]',
                render: (task) => {
                  const items: ActionItem[] = [
                    { label: 'View', onClick: () => navigate(`/tasks/${task._id}`) },
                    { label: 'Edit', onClick: () => navigate(`/tasks/${task._id}/edit`) },
                  ];
                  if (hasPermission('task:delete')) {
                    items.push({ label: 'Delete', onClick: () => handleDeleteTask(task._id), className: 'text-rose-500' });
                  }
                  return <RowActions items={items} />;
                },
              },
            ];
            return (
              <AdvancedTable
                data={filteredTasks}
                columns={taskColumns}
                emptyMessage={tasks.length === 0 ? 'No tasks yet. Create your first task to get started.' : 'No tasks match your filters.'}
                emptyIcon={<ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
              />
            );
          })()
        )}
      </div>
      <CreateTask
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        defaultProjectId={urlProjectId}
        onCreated={fetchTasks}
      />
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, taskId: '', loading: false })}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        loading={deleteConfirmModal.loading}
      />
      <EditProjectModal
        isOpen={!!editingProjectId}
        projectId={editingProjectId}
        onClose={() => setEditingProjectId(null)}
        onUpdated={() => {
          fetchProjects();
          fetchTasks();
        }}
      />
    </PageShell>
  );
}

export default ManageTasks;
