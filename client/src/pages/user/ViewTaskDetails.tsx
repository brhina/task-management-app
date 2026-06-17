import { useState, useEffect, useContext, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import { formatDate, getRelativeTime, isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageShell from '../../components/common/PageShell';
import { X, Check } from 'lucide-react';
import type { Task, TodoItem } from '../../types';

const STATUS_FLOW = [
  {
    value: TASK_STATUS.PENDING,
    label: 'Pending',
    color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25',
  },
  {
    value: TASK_STATUS.IN_PROGRESS,
    label: 'In Progress',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  },
  {
    value: TASK_STATUS.IN_REVIEW,
    label: 'In Review',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
  },
  {
    value: TASK_STATUS.COMPLETED,
    label: 'Completed',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
  },
];

function ViewTaskDetails() {
  const { user } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [tasksForDeps, setTasksForDeps] = useState<Task[]>([]);
  const [prereqToAdd, setPrereqToAdd] = useState('');
  const [addingDep, setAddingDep] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', id || ''));
      setTask(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDependencies = useCallback(async () => {
    try {
      if (!id) return;
      const res = await api.get(apiPaths.DEPENDENCIES.LIST, { params: { taskId: id } });
      setDependencies(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  }, [id]);

  const fetchTasksForDependencyPicker = useCallback(async () => {
    try {
      const res = await api.get(apiPaths.TASKS.GET_ALL_TASKS);
      setTasksForDeps(res.data?.data?.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks for dependency picker:', err);
    }
  }, []);

  useEffect(() => {
    fetchTaskDetails();
    fetchDependencies();
    if (user?.role === 'Admin') fetchTasksForDependencyPicker();
  }, [fetchTaskDetails, fetchDependencies, fetchTasksForDependencyPicker, user?.role]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      setError('');
      await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', id || ''), {
        status: newStatus,
      });
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleProgressUpdate = async (progress: number) => {
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', id || ''), { progress });
      setTask((prev) => (prev ? { ...prev, progress } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleChecklistUpdate = async (todoCheckList: TodoItem[]) => {
    try {
      setUpdating(true);
      setError('');
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', id || ''), {
        todoCheckList,
      });
      await fetchTaskDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update checklist');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPrereq = async () => {
    if (!task || !prereqToAdd) return;
    try {
      setAddingDep(true);
      await api.post(apiPaths.DEPENDENCIES.CREATE, {
        fromTaskId: prereqToAdd,
        toTaskId: task._id,
        type: 'FS',
      });
      setPrereqToAdd('');
      await fetchDependencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add dependency');
    } finally {
      setAddingDep(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      await api.delete(apiPaths.DEPENDENCIES.DELETE.replace(':id', depId));
      await fetchDependencies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove dependency');
    }
  };

  const handleTodoToggle = async (todoIndex: number, isCompleted: boolean) => {
    if (!task?.todoCheckList) return;
    const updated = [...task.todoCheckList];
    updated[todoIndex] = { ...updated[todoIndex], isCompleted };
    await handleChecklistUpdate(updated);
  };

  const handleAddChecklistItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim() || !task) return;
    const newItem: TodoItem = { text: newChecklistItem.trim(), isCompleted: false };
    setNewChecklistItem('');
    setShowAddChecklist(false);
    await handleChecklistUpdate([...(task.todoCheckList || []), newItem]);
  };

  const handleDeleteChecklistItem = async (index: number) => {
    if (!task?.todoCheckList) return;
    await handleChecklistUpdate(task.todoCheckList.filter((_, i) => i !== index));
  };

  const completedCount = task?.todoCheckList?.filter((t) => t.isCompleted).length || 0;
  const totalCount = task?.todoCheckList?.length || 0;
  const checklistProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const daysUntilDue = task ? getDaysUntilDue(task.dueDate) : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">Please Log In</h2>
          <p className="text-slate-400">You need to be logged in to view task details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <PageShell title="Task Details" subtitle="Loading...">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Loading task details..." />
        </div>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell title="Not Found" subtitle={error || 'Task not found.'}>
        <Link to={isAdminRoute ? '/admin/manage-tasks' : '/user/my-tasks'} className="btn-primary">
          Back to Tasks
        </Link>
      </PageShell>
    );
  }

  const blockedBy = dependencies.filter(
    (d) => String((d.toTaskId as any)?._id || d.toTaskId) === task._id
  );
  const blocking = dependencies.filter(
    (d) => String((d.fromTaskId as any)?._id || d.fromTaskId) === task._id
  );
  const currentStatusIdx = STATUS_FLOW.findIndex((s) => s.value === task.status);

  return (
    <PageShell
      title={task.title}
      subtitle={
        <>
          {task.description && <p className="text-slate-300 text-sm mb-2">{task.description}</p>}
          {/* <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                        </span>
                        {isOverdue(task.dueDate) && task.status !== TASK_STATUS.COMPLETED && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Overdue
                            </span>
                        )}
                        {daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3 && task.status !== TASK_STATUS.COMPLETED && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Due {daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue}d`}
                            </span>
                        )}
                    </div> */}
        </>
      }
      actions={
        <div className="flex gap-2">
          <Link
            to={isAdminRoute ? '/admin/manage-tasks' : '/user/my-tasks'}
            className="btn-secondary"
          >
            Back
          </Link>
        </div>
      }
    >
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Checklist */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Checklist
              </div>
              {totalCount > 0 && (
                <span className="text-xs text-slate-400 tabular-nums">
                  {completedCount}/{totalCount}
                </span>
              )}
            </div>

            {totalCount > 0 && (
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 text-right">
                  {checklistProgress}%
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {task.todoCheckList?.map((todo, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 group px-2 py-1.5 rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={(e) => handleTodoToggle(index, e.target.checked)}
                    disabled={updating}
                    className="h-4 w-4 shrink-0 text-primary focus:ring-primary border-slate-600 rounded cursor-pointer disabled:opacity-50"
                  />
                  <span
                    className={`flex-1 text-sm ${todo.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}
                  >
                    {todo.text}
                  </span>
                  <button
                    onClick={() => handleDeleteChecklistItem(index)}
                    disabled={updating}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-400 hover:text-rose-300 transition-opacity disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {showAddChecklist ? (
              <form onSubmit={handleAddChecklistItem} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="New item..."
                  className="input-dark flex-1 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newChecklistItem.trim() || updating}
                  className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChecklist(false);
                    setNewChecklistItem('');
                  }}
                  className="btn-secondary px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddChecklist(true)}
                className="mt-3 w-full px-3 py-1.5 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 hover:border-primary/50 hover:text-primary transition-colors"
              >
                + Add item
              </button>
            )}
          </div>

          {/* Dependencies */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Dependencies
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Blocked By
                </div>
                {blockedBy.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">None</div>
                ) : (
                  <div className="space-y-1.5">
                    {blockedBy.map((d: any) => (
                      <div
                        key={d._id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50"
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-slate-300 truncate">
                            {d.fromTaskId?.title || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {d.fromTaskId?.status} • {d.type}
                          </div>
                        </div>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => handleRemoveDependency(d._id)}
                            className="text-rose-400 hover:text-rose-300 text-xs shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Blocking
                </div>
                {blocking.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">None</div>
                ) : (
                  <div className="space-y-1.5">
                    {blocking.map((d: any) => (
                      <div
                        key={d._id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50"
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-slate-300 truncate">
                            {d.toTaskId?.title || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {d.toTaskId?.status} • {d.type}
                          </div>
                        </div>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => handleRemoveDependency(d._id)}
                            className="text-rose-400 hover:text-rose-300 text-xs shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {user?.role === 'Admin' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex gap-2">
                  <select
                    className="input-dark flex-1 text-sm"
                    value={prereqToAdd}
                    onChange={(e) => setPrereqToAdd(e.target.value)}
                  >
                    <option value="">Add prerequisite...</option>
                    {tasksForDeps
                      .filter((t) => t._id !== task._id)
                      .slice(0, 200)
                      .map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={!prereqToAdd || addingDep}
                    onClick={handleAddPrereq}
                  >
                    {addingDep ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Status Flow */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Status
            </div>
            <div className="space-y-1.5">
              {STATUS_FLOW.map((s, idx) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusUpdate(s.value)}
                  disabled={updating || task.status === s.value}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    task.status === s.value
                      ? s.color + ' ring-1 ring-white/10'
                      : 'border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  } disabled:cursor-not-allowed`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      idx < currentStatusIdx
                        ? 'bg-emerald-500'
                        : idx === currentStatusIdx
                          ? 'bg-primary'
                          : 'bg-slate-600'
                    }`}
                  />
                  {s.label}
                  {task.status === s.value && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
            {updating && (
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <LoadingSpinner size="sm" text="" />
                Updating...
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Progress
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={task.progress || 0}
                onChange={(e) => handleProgressUpdate(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm font-bold text-slate-200 tabular-nums w-10 text-right">
                {task.progress || 0}%
              </span>
            </div>
          </div>

          {/* Assignee */}
          {task.assignedTo && (
            <div className="card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Assignee
              </div>
              {typeof task.assignedTo === 'object' ? (
                <div className="flex items-center gap-3">
                  {task.assignedTo.profileImageUrl ? (
                    <img
                      className="h-10 w-10 rounded-full ring-2 ring-slate-700"
                      src={task.assignedTo.profileImageUrl}
                      alt={task.assignedTo.name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-700">
                      <span className="text-slate-400 font-semibold text-sm">
                        {task.assignedTo.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {task.assignedTo.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{task.assignedTo.email}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">User ID: {task.assignedTo}</div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Dates
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Due</span>
                <span
                  className={`text-xs font-medium ${isOverdue(task.dueDate) && task.status !== TASK_STATUS.COMPLETED ? 'text-rose-400' : 'text-slate-300'}`}
                >
                  {formatDate(task.dueDate)}
                </span>
              </div>
              {daysUntilDue !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Time left</span>
                  <span
                    className={`text-xs font-medium ${
                      isOverdue(task.dueDate)
                        ? 'text-rose-400'
                        : daysUntilDue <= 3
                          ? 'text-amber-400'
                          : 'text-slate-300'
                    }`}
                  >
                    {isOverdue(task.dueDate)
                      ? `${Math.abs(daysUntilDue)}d overdue`
                      : daysUntilDue === 0
                        ? 'Due today'
                        : `${daysUntilDue}d`}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-700/50 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Created</span>
                  <span className="text-xs text-slate-400">{getRelativeTime(task.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Updated</span>
                <span className="text-xs text-slate-400">{getRelativeTime(task.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default ViewTaskDetails;
