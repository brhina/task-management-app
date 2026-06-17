import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import TaskBoard from '../../components/tasks/TaskBoard';
import TaskCard from '../../components/tasks/TaskCard';
import UserDropZone from '../../components/tasks/UserDropZone';
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
    { value: '', label: 'All', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' },
    { value: 'Pending', label: 'Pending', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
    { value: 'In Progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' },
    { value: 'In Review', label: 'In Review', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-500' },
    { value: 'Completed', label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
];

function ManageTasks() {
    const { user, getEffectiveRole } = useContext(UserContext);
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'assignee'>('dueDate');
    const [statusSummary, setStatusSummary] = useState<StatusSummary>({ all: 0, pending: 0, inProgress: 0, inReview: 0, completed: 0 });

    const isProjectScoped = !!urlProjectId;
    const scopedProject = useMemo(() => projects.find(p => p._id === urlProjectId), [projects, urlProjectId]);

    useEffect(() => {
        fetchTasks();
        fetchUsers();
        fetchProjects();
    }, [statusFilter, projectFilter]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
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
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

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
            await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', taskId), { status: newStatus });
            fetchTasks();
        } catch (err) {
            setError('Failed to update task status');
        }
    };

    const handleAssigneeUpdate = async (taskId: string, userId: string) => {
        try {
            await api.put(apiPaths.TASKS.UPDATE_TASK_ASSIGNEE.replace(':id', taskId), { assignedTo: userId });
            fetchTasks();
        } catch (err) {
            setError('Failed to reassign task');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(apiPaths.TASKS.DELETE_TASK.replace(':id', taskId));
            fetchTasks();
        } catch (err) {
            setError('Failed to delete task');
        }
    };

    const filteredTasks = useMemo(() => {
        const filtered = tasks.filter(task => {
            const matchesSearch = !searchTerm ||
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
                return (order[a.priority as keyof typeof order] ?? 4) - (order[b.priority as keyof typeof order] ?? 4);
            }
            if (sortBy === 'assignee') {
                return (a.assignedTo?.name || '').localeCompare(b.assignedTo?.name || '');
            }
            const statusOrder = { 'Pending': 0, 'In Progress': 1, 'In Review': 2, 'Completed': 3 };
            return (statusOrder[a.status as keyof typeof statusOrder] ?? 4) - (statusOrder[b.status as keyof typeof statusOrder] ?? 4);
        });
    }, [tasks, searchTerm, sortBy]);

    const tasksByUser = useMemo(() => {
        const map: Record<string, number> = {};
        filteredTasks.forEach(task => {
            const id = task.assignedTo?._id;
            if (id) map[id] = (map[id] || 0) + 1;
        });
        return map;
    }, [filteredTasks]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = filteredTasks.find(t => t._id === event.active.id);
        setActiveTask(task || null);
    }, [filteredTasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
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
        const task = filteredTasks.find(t => t._id === taskId);
        if (task && task.status !== newStatus) {
            await handleStatusUpdate(taskId, newStatus);
        }
    }, [filteredTasks]);

    const effectiveRole = getEffectiveRole();
    if (!user || effectiveRole !== 'OrgAdmin') {
        return <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />;
    }

    return (
        <PageShell
            title={isProjectScoped && scopedProject ? scopedProject.name : "Manage Tasks"}
            subtitle={isProjectScoped ? "Tasks for this project" : "View and manage all tasks in the system"}
            actions={
                <div className="flex gap-2">
                    <Link to={isProjectScoped && urlProjectId ? `/admin/create-task?projectId=${urlProjectId}` : '/admin/create-task'} className="btn-primary">
                        Create Task
                    </Link>
                </div>
            }
        >
            <div className="space-y-4 overflow-hidden">
                {error && <div className="alert-error">{error}</div>}

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                        <FilterToolbar
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                            searchPlaceholder="Search by title, description, or assignee..."
                            filters={[
                                ...(!isProjectScoped ? [{
                                    id: 'projectFilter',
                                    label: 'Project',
                                    value: projectFilter,
                                    onChange: setProjectFilter,
                                    options: [
                                        { value: '', label: 'All Projects' },
                                        ...projects.map(p => ({ value: p._id, label: p.name })),
                                    ],
                                }] : []),
                            ]}
                            actions={
                                <button type="button" onClick={fetchTasks} className="btn-secondary w-full md:w-auto text-sm py-2">
                                    Refresh
                                </button>
                            }
                        />
                    </div>

                    {isProjectScoped && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Project:</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border border-primary/30">
                                {scopedProject?.name || 'Unknown'}
                            </span>
                            <Link to="/admin/projects" className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">
                                All projects
                            </Link>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="input-dark text-xs py-1.5"
                        >
                            <option value="dueDate">Sort: Due Date</option>
                            <option value="priority">Sort: Priority</option>
                            <option value="status">Sort: Status</option>
                            <option value="assignee">Sort: Assignee</option>
                        </select>

                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('board')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'board' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                Board
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                List
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                sidebarOpen
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
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
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <div className="text-slate-400 text-sm">
                            {tasks.length === 0 ? 'No tasks yet. Create your first task to get started.' : 'No tasks match your filters.'}
                        </div>
                    </div>
                ) : viewMode === 'board' ? (
                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
                            <div className="flex-1 min-w-0 overflow-x-hidden">
                                <TaskBoard
                                    tasks={filteredTasks}
                                    onTaskClick={(taskId) => navigate(`/admin/task/${taskId}`)}
                                />
                            </div>
                            {sidebarOpen && (
                                <div className="hidden lg:block w-48 xl:w-56 shrink-0">
                                    <div className="sticky top-4">
                                        <div className="card p-3">
                                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 px-1">Assign to</h3>
                                            <div className="space-y-1.5">
                                                {users.map(u => (
                                                    <UserDropZone key={u._id} user={u} taskCount={tasksByUser[u._id] || 0} />
                                                ))}
                                                {users.length === 0 && (
                                                    <div className="text-xs text-slate-500 text-center py-4">No users found</div>
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
                    <div className="card !p-0 overflow-hidden">
                        <div className="divide-y divide-slate-700/50">
                            {filteredTasks.map(task => {
                                const daysLeft = getDaysUntilDue(task.dueDate);
                                const overdue = isOverdue(task.dueDate) && task.status !== 'Completed';

                                return (
                                    <div key={task._id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link to={`/admin/task/${task._id}`} className="text-sm font-medium text-slate-200 group-hover:text-primary truncate transition-colors">
                                                        {task.title}
                                                    </Link>
                                                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                    <span className={`inline-flex px-1.5 py-0.5 font-semibold rounded ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    {task.dueDate && (
                                                        <span className={overdue ? 'text-rose-400 font-medium' : ''}>
                                                            {overdue ? `${Math.abs(daysLeft!)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                                                        </span>
                                                    )}
                                                    {task.assignedTo && (
                                                        <span className="text-slate-600">→ {task.assignedTo.name}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {task.progress != null && task.progress > 0 && (
                                                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                        <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 tabular-nums">{task.progress}%</span>
                                                </div>
                                            )}

                                            <select
                                                value={task.status}
                                                onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                className="input-dark text-[10px] py-1 px-2 w-24 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="In Review">In Review</option>
                                                <option value="Completed">Completed</option>
                                            </select>

                                            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/admin/task/${task._id}`} className="text-[10px] text-primary hover:text-primary-hover font-medium">
                                                    View
                                                </Link>
                                                <button onClick={() => handleDeleteTask(task._id)} className="text-[10px] text-rose-400 hover:text-rose-300 font-medium">
                                                    Delete
                                                </button>
                                            </div>
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

export default ManageTasks;
