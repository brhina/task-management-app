import { useState, useEffect, useContext, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getStatusColor, getPriorityColor, TASK_STATUS } from '../../constants/taskStatus';
import { formatDate, getRelativeTime, isOverdue, getDaysUntilDue } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageShell from '../../components/common/PageShell';
import ConfirmModal from '../../components/common/ConfirmModal';
import NavTabs, { type TabItem } from '../../components/common/NavTabs';
import TaskComments from '../../components/tasks/TaskComments';
import TaskActivityFeed from '../../components/tasks/TaskActivityFeed';
import TaskAttachments from '../../components/tasks/TaskAttachments';
import TaskTimeTracking from '../../components/tasks/TaskTimeTracking';
import TaskSubtasks from '../../components/tasks/TaskSubtasks';
import TaskDependencies from '../../components/tasks/TaskDependencies';
import MentionText from '../../components/common/MentionText';
import { useSocket } from '../../context/SocketContext';
import {
  X,
  Check,
  Edit2,
  Share2,
  Copy,
  Trash2,
  Calendar,
  User as UserIcon,
  Clock,
  Tag,
  Flame,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Paperclip,
  Activity,
  GitCommit,
  Plus,
  Bookmark,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { Task, TodoItem, User, TaskPriority, TaskStatus } from '../../types';

const STATUS_FLOW = [
  {
    value: TASK_STATUS.PENDING,
    label: 'Pending',
    color: 'bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/25',
  },
  {
    value: TASK_STATUS.IN_PROGRESS,
    label: 'In Progress',
    color: 'bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25',
  },
  {
    value: TASK_STATUS.IN_REVIEW,
    label: 'In Review',
    color: 'bg-purple-500/15 text-purple-600 border-purple-500/30 hover:bg-purple-500/25',
  },
  {
    value: TASK_STATUS.COMPLETED,
    label: 'Completed',
    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25',
  },
];

type ActiveTab = 'overview' | 'activity' | 'attachments' | 'comments' | 'dependencies';

export default function ViewTaskDetails() {
  const { user, hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Inline Edits
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const [editingDescription, setEditingDescription] = useState(false);
  const [descValue, setDescValue] = useState('');

  const [newTagInput, setNewTagInput] = useState('');
  const [newBlockerInput, setNewBlockerInput] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Dependencies & Org Members
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [tasksForDeps, setTasksForDeps] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  // Modals & Actions
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Presence
  const [viewers, setViewers] = useState<Array<{ userId: string; name?: string }>>([]);
  const { socket } = useSocket();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchTaskDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', id || ''));
      const fetchedTask: Task = response.data.data;
      setTask(fetchedTask);
      setTitleValue(fetchedTask.title || '');
      setDescValue(fetchedTask.description || '');
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
      const res = await api.get(apiPaths.TASKS.GET_ALL_TASKS, { params: { topLevel: 'true' } });
      setTasksForDeps(res.data?.data?.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks for dependency picker:', err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      let list: User[] = [];
      const orgId = localStorage.getItem('activeOrgId');
      if (orgId) {
        try {
          const res = await api.get(apiPaths.ORG_MEMBERSHIP.GET_MEMBERS.replace(':orgId', orgId));
          const rawMembers = res.data?.data || res.data?.members || [];
          list = rawMembers.map((m: any) =>
            m.userId && typeof m.userId === 'object'
              ? m.userId
              : { _id: m.userId || m._id, name: m.name || m.email, email: m.email, profileImageUrl: m.profileImageUrl }
          );
        } catch (e) {
          // Fallback to all users if org members call fails
        }
      }
      if (!list || list.length === 0) {
        const res = await api.get(apiPaths.USERS.GET_ALL_USERS);
        list = res.data?.data?.users || res.data?.users || (Array.isArray(res.data) ? res.data : []);
      }
      setMembers(list);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, []);

  useEffect(() => {
    fetchTaskDetails();
    fetchDependencies();
    fetchMembers();
    if (hasPermission('task:update')) fetchTasksForDependencyPicker();
  }, [
    fetchTaskDetails,
    fetchDependencies,
    fetchTasksForDependencyPicker,
    fetchMembers,
    hasPermission,
  ]);

  // Socket Presence
  useEffect(() => {
    if (!socket || !id || !user) return;
    socket.emit('viewing_task', { taskId: id, name: user.name });

    const onPresence = (p: { userId: string; name?: string; viewingTaskId: string | null }) => {
      setViewers((prev) => {
        if (p.viewingTaskId === id) {
          if (prev.some((v) => v.userId === p.userId)) return prev;
          return [...prev, { userId: p.userId, name: p.name }];
        }
        return prev.filter((v) => v.userId !== p.userId);
      });
    };
    socket.on('presence_update', onPresence);

    api
      .get(apiPaths.NOTIFICATIONS.PRESENCE, { params: { taskId: id } })
      .then((r) => {
        const list = (r.data.data || []).filter(
          (v: any) => String(v.userId) !== String(user._id)
        );
        setViewers(list);
      })
      .catch(() => {});

    return () => {
      socket.emit('leave_task');
      socket.off('presence_update', onPresence);
    };
  }, [socket, id, user]);

  // Actions
  const handleSaveAsTemplate = async () => {
    if (!id) return;
    try {
      setSavingTemplate(true);
      await api.post(apiPaths.TASKS.SAVE_AS_TEMPLATE.replace(':id', id), {});
      showToast('Task saved as template');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Task link copied to clipboard');
  };

  const handleDeleteTask = async () => {
    if (!id) return;
    try {
      await api.delete(apiPaths.TASKS.DELETE_TASK.replace(':id', id));
      navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Field Updates
  const handleUpdateTaskField = async (updateData: Partial<Task>) => {
    if (!id) return;
    try {
      setUpdating(true);
      setError('');
      await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', id), updateData);
      await fetchTaskDetails();
      showToast('Updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      setError('');
      await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', id || ''), {
        status: newStatus,
      });
      await fetchTaskDetails();
      showToast(`Status set to ${newStatus}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Title Save
  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === task?.title) {
      setEditingTitle(false);
      return;
    }
    await handleUpdateTaskField({ title: titleValue.trim() });
    setEditingTitle(false);
  };

  // Description Save
  const handleSaveDescription = async () => {
    if (descValue === task?.description) {
      setEditingDescription(false);
      return;
    }
    await handleUpdateTaskField({ description: descValue });
    setEditingDescription(false);
  };

  // Tag Manager
  const handleAddTag = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !task) return;
    const currentTags = task.tags || [];
    if (currentTags.includes(newTagInput.trim())) return;
    await handleUpdateTaskField({ tags: [...currentTags, newTagInput.trim()] });
    setNewTagInput('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!task) return;
    const updated = (task.tags || []).filter((t) => t !== tagToRemove);
    await handleUpdateTaskField({ tags: updated });
  };

  // Blocker Manager
  const handleAddBlocker = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBlockerInput.trim() || !task) return;
    const currentBlockers = task.blockersText || [];
    await handleUpdateTaskField({ blockersText: [...currentBlockers, newBlockerInput.trim()] });
    setNewBlockerInput('');
  };

  const handleRemoveBlocker = async (index: number) => {
    if (!task?.blockersText) return;
    const updated = task.blockersText.filter((_, i) => i !== index);
    await handleUpdateTaskField({ blockersText: updated });
  };

  // Subtask Checklist (if current task is a subtask)
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
    await handleChecklistUpdate([...(task.todoCheckList || []), newItem]);
  };

  const handleDeleteChecklistItem = async (index: number) => {
    if (!task?.todoCheckList) return;
    await handleChecklistUpdate(task.todoCheckList.filter((_, i) => i !== index));
  };

  const daysUntilDue = task ? getDaysUntilDue(task.dueDate) : null;
  const currentStatusIdx = task ? STATUS_FLOW.findIndex((s) => s.value === task.status) : -1;
  const canEdit = hasPermission('task:update');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
          <h2 className="text-2xl font-bold mb-2">Please Log In</h2>
          <p className="text-slate-400">You need to be logged in to view task details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <PageShell title="Task Details" subtitle="Loading task workspace...">
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" text="Preparing task details workspace..." />
        </div>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell title="Task Not Found" subtitle={error || 'The requested task could not be loaded.'}>
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <p className="text-slate-600 mb-4">{error || 'Task may have been deleted or moved.'}</p>
          <Link to="/tasks" className="btn-primary">
            Back to Tasks List
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title=""
      subtitle=""
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-500" /> Share Task Link
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Bookmark className="w-4 h-4 text-slate-500" /> Save as Template
              </button>

              <Link
                to={`/tasks/${id}/edit`}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 flex items-center gap-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-primary" /> Edit Task
              </Link>
            </>
          )}

          {hasPermission('task:delete') && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" /> Delete Task
            </button>
          )}
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Presence Viewers Banner */}
      {viewers.length > 0 && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold">Active Collaborators:</span>
          <span>
            {viewers.map((v) => v.name || 'User').join(', ')} currently viewing this task
          </span>
        </div>
      )}

      {/* HEADER RIBBON & TITLE AREA */}
      <div className="card space-y-4 bg-gradient-to-br from-white via-slate-50/40 to-indigo-50/20 border border-slate-200/80 shadow-sm mb-6">
        
        {/* Editable Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  className="flex-1 text-xl sm:text-2xl font-bold text-slate-900 border-2 border-indigo-500 rounded-xl px-3 py-1 focus:outline-none bg-white shadow-sm"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }}
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => canEdit && setEditingTitle(true)}
                className={`text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 group ${
                  canEdit ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''
                }`}
              >
                <span>{task.title}</span>
                {canEdit && (
                  <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </h1>
            )}
          </div>
        </div>

        {/* Quick Ribbon Metadata Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(
              task.status
            )}`}
          >
            <div className="w-2 h-2 rounded-full bg-current" />
            {task.status}
          </span>

          {/* Priority Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${getPriorityColor(
              task.priority
            )}`}
          >
            <Flame className="w-3.5 h-3.5" />
            {task.priority} Priority
          </span>

          {/* Category */}
          {task.category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <Layers className="w-3 h-3 text-slate-400" />
              {task.category}
            </span>
          )}

          {/* Due Status */}
          {isOverdue(task.dueDate) && task.status !== TASK_STATUS.COMPLETED && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue
            </span>
          )}

          {daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3 && task.status !== TASK_STATUS.COMPLETED && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              Due {daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}
            </span>
          )}

          {/* Due Date Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
            <Calendar className="w-3 h-3 text-slate-400" />
            Due: {formatDate(task.dueDate)}
          </span>
        </div>
      </div>

      {/* TAB NAVIGATION BAR */}
      <NavTabs<ActiveTab>
        tabs={[
          { id: 'overview', label: 'Overview & Subtasks', icon: FileText },
          { id: 'activity', label: 'Activity & Time', icon: Activity },
          {
            id: 'attachments',
            label: 'Attachments',
            icon: Paperclip,
            badge: task.attachments?.length || undefined,
          },
          { id: 'comments', label: 'Discussion', icon: MessageSquare },
          {
            id: 'dependencies',
            label: 'Dependencies',
            icon: GitCommit,
            badge: dependencies.length || undefined,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mt-6 mb-6"
      />

      {/* MAIN TAB CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: OVERVIEW & SUBTASKS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description Card */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Task Description
                  </h3>
                  {canEdit && !editingDescription && (
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Description
                    </button>
                  )}
                </div>

                {editingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border-2 border-indigo-500 p-3 text-sm text-slate-800 focus:outline-none bg-white shadow-sm resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setDescValue(task.description);
                          setEditingDescription(false);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDescription}
                        className="btn-primary px-4 py-1.5 text-xs font-semibold"
                      >
                        Save Description
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => canEdit && setEditingDescription(true)}
                    className={`p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 text-sm text-slate-700 leading-relaxed ${
                      canEdit ? 'hover:bg-slate-100/70 cursor-pointer transition-colors' : ''
                    }`}
                  >
                    {task.description ? (
                      <MentionText text={task.description} />
                    ) : (
                      <span className="text-slate-400 italic">No description provided. Click to add details.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Tags & Categories Manager */}
              <div className="card space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-slate-400" /> Tags & Categorization
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  {(task.tags || []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200/50 group"
                    >
                      #{t}
                      {canEdit && (
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="text-indigo-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {task.tags?.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No tags added yet.</span>
                  )}
                </div>

                {canEdit && (
                  <form onSubmit={handleAddTag} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add new tag (press Enter)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tag
                    </button>
                  </form>
                )}
              </div>

              {/* Blockers Section */}
              <div className="card space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-rose-600">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Reported Blockers
                </h3>

                <div className="space-y-2">
                  {(task.blockersText || []).map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60 text-xs text-rose-800"
                    >
                      <span>{b}</span>
                      {canEdit && (
                        <button
                          onClick={() => handleRemoveBlocker(idx)}
                          className="text-rose-400 hover:text-rose-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!task.blockersText || task.blockersText.length === 0) && (
                    <span className="text-xs text-slate-400 italic block">No blockers reported for this task.</span>
                  )}
                </div>

                {canEdit && (
                  <form onSubmit={handleAddBlocker} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Report a blocker..."
                      value={newBlockerInput}
                      onChange={(e) => setNewBlockerInput(e.target.value)}
                      className="flex-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={!newBlockerInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      Add Blocker
                    </button>
                  </form>
                )}
              </div>

              {/* Subtasks or Subtask Checklist Card */}
              {!task.parentTaskId ? (
                <TaskSubtasks
                  parentId={task._id}
                  isAdmin={canEdit}
                  detailBasePath="/tasks"
                  onProgressChange={fetchTaskDetails}
                  members={members}
                />
              ) : (
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Subtask Checklist
                    </h3>
                    {task.todoCheckList && task.todoCheckList.length > 0 && (
                      <span className="text-xs font-bold text-slate-600 tabular-nums">
                        {task.todoCheckList.filter((t) => t.isCompleted).length}/{task.todoCheckList.length} Completed
                      </span>
                    )}
                  </div>

                  {task.todoCheckList && task.todoCheckList.length > 0 && (
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            (task.todoCheckList.filter((t) => t.isCompleted).length / task.todoCheckList.length) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    {task.todoCheckList?.map((todo, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={todo.isCompleted}
                          onChange={(e) => handleTodoToggle(index, e.target.checked)}
                          disabled={updating}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer disabled:opacity-50"
                        />
                        <span
                          className={`flex-1 text-sm ${
                            todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                          }`}
                        >
                          {todo.text}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteChecklistItem(index)}
                            disabled={updating}
                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-600 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="Add item to checklist..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newChecklistItem.trim() || updating}
                        className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        Add Item
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVITY & TIME */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <TaskTimeTracking taskId={task._id} canEdit={canEdit} />
              <TaskActivityFeed taskId={task._id} />
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <TaskAttachments
              task={task}
              onUpdated={fetchTaskDetails}
              canDelete={canEdit}
              canUpload={canEdit}
            />
          )}

          {/* TAB 4: COMMENTS */}
          {activeTab === 'comments' && (
            <TaskComments
              taskId={task._id}
              members={members}
              canDelete={canEdit}
              canPost={canEdit}
            />
          )}

          {/* TAB 5: DEPENDENCIES */}
          {activeTab === 'dependencies' && (
            <TaskDependencies
              taskId={task._id}
              dependencies={dependencies}
              tasksForDeps={tasksForDeps}
              canEdit={canEdit}
              onUpdated={() => {
                fetchTaskDetails();
                fetchDependencies();
              }}
            />
          )}
        </div>

        {/* Right Column - Sidebar Widgets & Controls */}
        <div className="space-y-6">
          {/* Status Flow Switcher */}
          <div className="card space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Progression
            </h3>
            <div className="space-y-2">
              {STATUS_FLOW.map((s, idx) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleStatusUpdate(s.value)}
                  disabled={updating || task.status === s.value || !canEdit}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    task.status === s.value
                      ? s.color + ' shadow-sm ring-1 ring-black/5'
                      : 'border-slate-200/80 text-slate-600 hover:bg-slate-100/60 hover:text-slate-800'
                  } disabled:cursor-not-allowed`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      idx < currentStatusIdx
                        ? 'bg-emerald-500'
                        : idx === currentStatusIdx
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span>{s.label}</span>
                  {task.status === s.value && <Check className="w-4 h-4 ml-auto text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Slider Widget */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Overall Progress
              </h3>
              <span className="text-sm font-extrabold text-indigo-600 tabular-nums">
                {task.progress || 0}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={task.progress || 0}
              onChange={(e) => handleUpdateTaskField({ progress: Number(e.target.value) })}
              disabled={!canEdit}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
          </div>

          {/* Assignee Card */}
          {(() => {
            const assignedUser: any = task.assignedTo
              ? typeof task.assignedTo === 'object'
                ? task.assignedTo
                : members.find((m) => String(m._id) === String(task.assignedTo)) || null
              : null;

            return (
              <div className="card space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Assignee</span>
                  <UserIcon className="w-4 h-4 text-indigo-500" />
                </h3>

                {assignedUser ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
                    {assignedUser.profileImageUrl ? (
                      <img
                        className="h-10 w-10 rounded-full ring-2 ring-indigo-200 object-cover shadow-2xs shrink-0"
                        src={assignedUser.profileImageUrl}
                        alt={assignedUser.name || 'Assignee'}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-2xs shrink-0">
                        {assignedUser.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {assignedUser.name || 'Assigned Member'}
                      </div>
                      {assignedUser.email && (
                        <div className="text-[11px] text-slate-500 truncate">{assignedUser.email}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-400 italic flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Currently Unassigned</span>
                  </div>
                )}

                {canEdit && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {assignedUser ? 'Reassign Task' : 'Select Assignee'}
                    </label>
                    <select
                      value={typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo || ''}
                      onChange={(e) => handleUpdateTaskField({ assignedTo: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Unassigned --</option>
                      {members.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Effort & Impact Card */}
          <div className="card space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Effort & Impact Scores
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500">Estimated Effort</div>
                <div className="text-base font-extrabold text-slate-800 mt-1 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {task.effortHours || 1} hrs
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500">Impact Score</div>
                <div className="text-base font-extrabold text-slate-800 mt-1 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500" />
                  {task.impactScore || 5} / 10
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Timeline Info */}
          <div className="card space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Timeline Details
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Due Date</span>
                <span className="font-semibold text-slate-800">{formatDate(task.dueDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-semibold text-slate-600">{getRelativeTime(task.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Updated</span>
                <span className="font-semibold text-slate-600">{getRelativeTime(task.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${task.title}" and its subtasks? This action cannot be undone.`}
        confirmText="Permanently Delete"
      />
    </PageShell>
  );
}
