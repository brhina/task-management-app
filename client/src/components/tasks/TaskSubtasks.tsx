import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Task, TodoItem, User, TaskPriority, TaskStatus } from '../../types';
import { TASK_STATUS, getPriorityColor, getStatusColor } from '../../constants/taskStatus';
import SubtaskDetailModal from './SubtaskDetailModal';
import ConfirmModal from '../common/ConfirmModal';
import {
  ListTree,
  GripVertical,
  Plus,
  X,
  Check,
  Calendar,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatDate, isOverdue } from '../../utils/dateUtils';

interface Props {
  parentId: string;
  isAdmin: boolean;
  detailBasePath: string;
  onProgressChange?: () => void;
  members?: User[];
}

function SortableSubtaskItem({
  task,
  isAdmin,
  members = [],
  onChecklistUpdate,
  onOpenDetails,
  onDeleteSubtask,
  onStatusChange,
}: {
  task: Task;
  isAdmin: boolean;
  members: User[];
  onChecklistUpdate: () => void;
  onOpenDetails: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task._id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [updating, setUpdating] = useState(false);

  const completedCount = task.todoCheckList?.filter((t) => t.isCompleted).length || 0;
  const totalCount = task.todoCheckList?.length || 0;
  const isComplete = task.status === TASK_STATUS.COMPLETED;

  const assignedUser =
    typeof task.assignedTo === 'object'
      ? task.assignedTo
      : members.find((m) => m._id === task.assignedTo);

  const handleToggleItem = async (index: number, isCompleted: boolean) => {
    if (!task.todoCheckList) return;
    const updated = [...task.todoCheckList];
    updated[index] = { ...updated[index], isCompleted };
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: updated,
      });
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const newItemObj: TodoItem = { text: newItem.trim(), isCompleted: false };
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: [...(task.todoCheckList || []), newItemObj],
      });
      setNewItem('');
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteItem = async (index: number) => {
    if (!task.todoCheckList) return;
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: task.todoCheckList.filter((_, i) => i !== index),
      });
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-all duration-200 bg-white overflow-hidden ${
        isComplete
          ? 'border-emerald-200/60 bg-emerald-50/20 shadow-sm'
          : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isAdmin && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0 touch-none p-0.5 rounded hover:bg-slate-100"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          {/* Quick Checkbox / Status Indicator */}
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                task._id,
                isComplete ? TASK_STATUS.PENDING : TASK_STATUS.COMPLETED
              )
            }
            title={isComplete ? 'Mark as Incomplete' : 'Mark as Complete'}
            className="shrink-0 p-0.5 rounded text-slate-400 hover:text-emerald-600 transition-colors"
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-emerald-500 transition-colors" />
            )}
          </button>

          {/* Title & Quick Metadata */}
          <button
            type="button"
            onClick={() => onOpenDetails(task._id)}
            className="min-w-0 text-left flex-1 group"
          >
            <span
              className={`text-sm font-medium transition-colors block truncate ${
                isComplete
                  ? 'line-through text-slate-400'
                  : 'text-slate-800 group-hover:text-indigo-600'
              }`}
            >
              {task.title}
            </span>
          </button>
        </div>

        {/* Right Badges & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Priority Pill */}
          {task.priority && (
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md ${getPriorityColor(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          )}

          {/* Status Dropdown */}
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value as TaskStatus)}
            disabled={!isAdmin}
            className={`text-xs font-semibold rounded-lg px-2 py-1 border transition-colors cursor-pointer outline-none ${getStatusColor(
              task.status
            )}`}
          >
            <option value={TASK_STATUS.PENDING}>Pending</option>
            <option value={TASK_STATUS.IN_PROGRESS}>In Progress</option>
            <option value={TASK_STATUS.IN_REVIEW}>In Review</option>
            <option value={TASK_STATUS.COMPLETED}>Completed</option>
          </select>

          {/* Due Date Indicator */}
          {task.dueDate && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                isOverdue(task.dueDate) && !isComplete
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Assignee Avatar */}
          {assignedUser && (
            <div
              className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-indigo-200 shrink-0"
              title={assignedUser.name}
            >
              {assignedUser.profileImageUrl ? (
                <img
                  src={assignedUser.profileImageUrl}
                  alt={assignedUser.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                assignedUser.name?.charAt(0).toUpperCase()
              )}
            </div>
          )}

          {/* Checklist Toggle Button */}
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors"
            >
              <span>
                {completedCount}/{totalCount}
              </span>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenDetails(task._id)}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
              title="Edit Subtask Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDeleteSubtask(task._id)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                title="Delete Subtask"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Checklist */}
      {expanded && (
        <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 space-y-2">
          <div className="space-y-1">
            {task.todoCheckList?.map((todo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 group px-2 py-1 rounded-md hover:bg-white transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={(e) => handleToggleItem(index, e.target.checked)}
                  disabled={updating}
                  className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer disabled:opacity-50"
                />
                <span
                  className={`flex-1 text-xs ${
                    todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {todo.text}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    disabled={updating}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-400 hover:text-rose-600 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddItem} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add item..."
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newItem.trim() || updating}
                className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export default function TaskSubtasks({
  parentId,
  isAdmin,
  detailBasePath,
  onProgressChange,
  members = [],
}: Props) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Modal state
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete Confirmation state
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchSubtasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(apiPaths.TASKS.SUBTASKS.replace(':id', parentId));
      setSubtasks(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((t) => t._id === active.id);
    const newIndex = subtasks.findIndex((t) => t._id === over.id);
    const next = arrayMove(subtasks, oldIndex, newIndex);
    setSubtasks(next);
    try {
      await api.put(apiPaths.TASKS.REORDER_SUBTASKS.replace(':id', parentId), {
        orderedIds: next.map((t) => t._id),
      });
    } catch (err) {
      console.error(err);
      fetchSubtasks();
    }
  };

  const addSubtask = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isAdmin) return;
    try {
      const parentRes = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', parentId));
      const parent = parentRes.data.data;
      const targetAssignedTo = assignedTo || (typeof parent.assignedTo === 'object' ? parent.assignedTo._id : parent.assignedTo);

      await api.post(apiPaths.TASKS.CREATE_TASK, {
        title: title.trim(),
        description: `Subtask of ${parent.title}`,
        dueDate: dueDate ? new Date(dueDate).toISOString() : parent.dueDate,
        assignedTo: targetAssignedTo,
        parentTaskId: parentId,
        projectId: typeof parent.projectId === 'object' ? parent.projectId?._id : parent.projectId,
        priority: priority || 'Medium',
      });

      setTitle('');
      setDueDate('');
      setAssignedTo('');
      setShowAdvancedAdd(false);
      await fetchSubtasks();
      onProgressChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await api.put(apiPaths.TASKS.UPDATE_TASK_STATUS.replace(':id', id), { status });
      await fetchSubtasks();
      onProgressChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteSubtask = async () => {
    if (!subtaskToDelete) return;
    try {
      await api.delete(apiPaths.TASKS.DELETE_TASK.replace(':id', subtaskToDelete));
      setSubtaskToDelete(null);
      await fetchSubtasks();
      onProgressChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter subtasks
  const filteredSubtasks = subtasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'ACTIVE') return matchesSearch && t.status !== TASK_STATUS.COMPLETED;
    if (statusFilter === 'COMPLETED') return matchesSearch && t.status === TASK_STATUS.COMPLETED;
    return matchesSearch;
  });

  const completedCount = subtasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const totalSubtasks = subtasks.length;
  const avgProgress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  return (
    <div className="card space-y-4">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <ListTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Subtasks
              {totalSubtasks > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                  {completedCount} / {totalSubtasks} Completed
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">Break down tasks into actionable subcomponents</p>
          </div>
        </div>

        {/* Overall Progress Indicator */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600 tabular-nums">{avgProgress}%</span>
          </div>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      {totalSubtasks > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search subtasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({totalSubtasks})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Active ({totalSubtasks - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'COMPLETED'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      )}

      {/* Subtasks List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredSubtasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {filteredSubtasks.length === 0 && (
              <li className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                {subtasks.length === 0 ? 'No subtasks created yet. Add one below.' : 'No subtasks match your filter.'}
              </li>
            )}
            {filteredSubtasks.map((t) => (
              <SortableSubtaskItem
                key={t._id}
                task={t}
                isAdmin={isAdmin}
                members={members}
                onChecklistUpdate={fetchSubtasks}
                onOpenDetails={(id) => {
                  setActiveSubtaskId(id);
                  setIsModalOpen(true);
                }}
                onDeleteSubtask={(id) => setSubtaskToDelete(id)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Quick Add Subtask Form */}
      {isAdmin && (
        <form onSubmit={addSubtask} className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add new subtask..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
              className={`p-2 rounded-xl border transition-colors ${
                showAdvancedAdd
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title="Toggle Advanced Subtask Options"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* Advanced Creation Controls */}
          {showAdvancedAdd && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assignee</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Inherit Parent Assignee</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Subtask Detail Modal */}
      <SubtaskDetailModal
        subtaskId={activeSubtaskId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveSubtaskId(null);
        }}
        onUpdated={() => {
          fetchSubtasks();
          onProgressChange?.();
        }}
        isAdmin={isAdmin}
        members={members}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(subtaskToDelete)}
        onClose={() => setSubtaskToDelete(null)}
        onConfirm={confirmDeleteSubtask}
        title="Delete Subtask"
        message="Are you sure you want to delete this subtask? This action cannot be undone."
      />
    </div>
  );
}
