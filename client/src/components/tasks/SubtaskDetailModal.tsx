import { useState, useEffect, type FormEvent } from 'react';
import { X, Calendar, User as UserIcon, Clock, CheckSquare, Plus, Trash2, Save, Tag } from 'lucide-react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Task, TodoItem, User, TaskPriority, TaskStatus } from '../../types';
import { TASK_STATUS, getPriorityColor } from '../../constants/taskStatus';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props {
  subtaskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  isAdmin: boolean;
  members: User[];
}

export default function SubtaskDetailModal({
  subtaskId,
  isOpen,
  onClose,
  onUpdated,
  isAdmin,
  members,
}: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [effortHours, setEffortHours] = useState<number>(1);
  const [checklist, setChecklist] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    if (!isOpen || !subtaskId) {
      setTask(null);
      return;
    }

    const fetchSubtask = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', subtaskId));
        const sub: Task = res.data.data;
        setTask(sub);
        setTitle(sub.title || '');
        setDescription(sub.description || '');
        setStatus(sub.status || 'Pending');
        setPriority(sub.priority || 'Medium');
        setDueDate(sub.dueDate ? new Date(sub.dueDate).toISOString().split('T')[0] : '');
        setAssignedTo(
          typeof sub.assignedTo === 'object' ? sub.assignedTo._id : sub.assignedTo || ''
        );
        setEffortHours(sub.effortHours || 1);
        setChecklist(sub.todoCheckList || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch subtask details');
      } finally {
        setLoading(false);
      }
    };

    fetchSubtask();
  }, [isOpen, subtaskId]);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!subtaskId || !task) return;

    try {
      setSaving(true);
      setError('');
      await api.put(apiPaths.TASKS.UPDATE_TASK.replace(':id', subtaskId), {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : task.dueDate,
        assignedTo: assignedTo || undefined,
        effortHours: Number(effortHours),
        todoCheckList: checklist,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subtask');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    setChecklist([...checklist, { text: newTodo.trim(), isCompleted: false }]);
    setNewTodo('');
  };

  const handleToggleTodo = (index: number) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], isCompleted: !updated[index].isCompleted };
    setChecklist(updated);
  };

  const handleDeleteTodo = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/50">
              Subtask Details
            </span>
            {task && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(priority)}`}>
                {priority}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" text="Loading subtask..." />
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Subtask Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isAdmin}
                required
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdmin}
                rows={3}
                placeholder="Add subtask description..."
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={TASK_STATUS.PENDING}>Pending</option>
                  <option value={TASK_STATUS.IN_PROGRESS}>In Progress</option>
                  <option value={TASK_STATUS.IN_REVIEW}>In Review</option>
                  <option value={TASK_STATUS.COMPLETED}>Completed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Assignee
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Effort Hours */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Estimated Hours
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={effortHours}
                  onChange={(e) => setEffortHours(Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-slate-400" /> Checklist Items ({checklist.filter(c => c.isCompleted).length}/{checklist.length})
              </label>

              <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto p-1">
                {checklist.map((todo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
                      onChange={() => handleToggleTodo(idx)}
                      disabled={!isAdmin}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                    />
                    <span className={`flex-1 text-xs ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {todo.text}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTodo(idx)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-0.5 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTodo();
                      }
                    }}
                    placeholder="Add item to subtask checklist..."
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    disabled={!newTodo.trim()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
