import { useState, useEffect, useContext, useMemo, type FormEvent } from 'react';
import {
  Check,
  ChevronDown,
  User as UserIcon,
  UserX,
  Calendar,
  Plus,
  Trash2,
  Tag,
  Layers,
  Sliders,
  Target,
  Repeat,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import Modal from '../../components/common/Modal';
import type { Goal, Project, User, TaskTemplate } from '../../types';

interface TodoItem {
  text: string;
  isCompleted: boolean;
}

interface CreateTaskProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  onCreated?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low', color: 'bg-slate-500/15 text-slate-600 border-slate-300 hover:bg-slate-500/25' },
  { value: 'Medium', label: 'Medium', color: 'bg-blue-500/15 text-blue-600 border-blue-300 hover:bg-blue-500/25' },
  { value: 'High', label: 'High', color: 'bg-amber-500/15 text-amber-600 border-amber-300 hover:bg-amber-500/25' },
  { value: 'Critical', label: 'Critical', color: 'bg-rose-500/15 text-rose-600 border-rose-300 hover:bg-rose-500/25' },
];

const DATE_PRESETS = [
  {
    label: 'Today',
    getValue: () => {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    },
  },
  {
    label: 'Tomorrow',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    },
  },
  {
    label: 'This Week',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + (5 - d.getDay()));
      d.setHours(18, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    },
  },
  {
    label: 'Next Week',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(18, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    },
  },
  {
    label: 'In 2 Weeks',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      d.setHours(18, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    },
  },
];

function CreateTask({ isOpen, onClose, defaultProjectId = '', onCreated }: CreateTaskProps) {
  const { hasPermission } = useContext(UserContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [impactScore, setImpactScore] = useState(5);
  const [effortHours, setEffortHours] = useState(1);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate('');
      setAssignedTo('');
      setProjectId(defaultProjectId);
      setGoalIds([]);
      setTags('');
      setCategory('');
      setImpactScore(5);
      setEffortHours(1);
      setTodoItems([]);
      setNewChecklistInput('');
      setStartDate('');
      setSelectedTemplateId('');
      setRecurrenceEnabled(false);
      setShowAdvanced(false);
      setError('');

      Promise.all([
        api.get(apiPaths.USERS.GET_ALL_USERS).then((r) => setUsers(r.data?.users || r.data || [])),
        api.get(apiPaths.PROJECTS.LIST).then((r) => setProjects(r.data?.data?.projects || [])),
        api.get(apiPaths.GOALS.LIST).then((r) => setGoals(r.data?.data?.goals || [])),
        api.get(apiPaths.TASK_TEMPLATES.LIST).then((r) => setTemplates(r.data?.data || [])),
      ]).catch(() => {});
    }
  }, [isOpen, defaultProjectId]);

  const scopedProject = useMemo(
    () => projects.find((p) => p._id === projectId),
    [projects, projectId]
  );

  const applyTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = templates.find((x) => x._id === templateId);
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description);
    setPriority(t.priority || 'Medium');
    setTags((t.tags || []).join(', '));
    setCategory(t.category || '');
    setImpactScore(t.impactScore ?? 5);
    setEffortHours(t.effortHours ?? 1);
    setTodoItems((t.checklist || []).map((c) => ({ text: c.text, isCompleted: false })));
  };

  const handleGoalToggle = (goalId: string) => {
    setGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistInput.trim()) return;
    setTodoItems((prev) => [...prev, { text: newChecklistInput.trim(), isCompleted: false }]);
    setNewChecklistInput('');
  };

  const removeTodoItem = (index: number) =>
    setTodoItems((prev) => prev.filter((_, i) => i !== index));

  const updateTodoText = (index: number, text: string) => {
    const updated = [...todoItems];
    updated[index] = { ...updated[index], text };
    setTodoItems(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    if (!dueDate) return setError('Due date is required');
    if (!projectId) return setError('Please select a project');

    setLoading(true);
    setError('');
    try {
      await api.post(apiPaths.TASKS.CREATE_TASK, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate,
        startDate: startDate || undefined,
        assignedTo: assignedTo || null,
        projectId: projectId || undefined,
        goalIds: goalIds.length > 0 ? goalIds : undefined,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        category: category.trim() || undefined,
        impactScore,
        effortHours,
        todoCheckList: todoItems.filter((item) => item.text.trim()),
        recurrence: recurrenceEnabled
          ? {
              frequency: recurrenceFreq,
              interval: 1,
              nextRunAt: new Date(dueDate).toISOString(),
            }
          : null,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {scopedProject ? `New Task in ${scopedProject.name}` : 'Create Task'}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              {scopedProject ? scopedProject.description || 'Adding task to project' : 'Organize work, assign responsibilities, and track deliverables'}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">Ctrl + Enter</kbd> to submit
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} type="button" className="btn-secondary text-xs px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              form="create-task-form"
              disabled={loading || !hasPermission('task:create')}
              className="btn-primary disabled:opacity-50 min-w-[140px] text-xs font-semibold px-5 py-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Template Banner */}
        {templates.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Speed up creation with a pre-configured template</span>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="text-xs font-semibold bg-white border border-indigo-200 text-indigo-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="">Blank Task</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MAIN FORM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Core Task Info (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field w-full text-base font-semibold py-2.5 px-3.5 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="What needs to be accomplished?"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description & Specifications
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="input-field w-full text-xs leading-relaxed resize-none py-2.5 px-3.5"
                placeholder="Provide detailed description, context, deliverables, or acceptance criteria..."
              />
            </div>

            {/* Subtask Checklist */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  Checklist Items ({todoItems.length})
                </span>
                {todoItems.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-500">
                    {todoItems.filter((i) => i.isCompleted).length} of {todoItems.length} completed
                  </span>
                )}
              </div>

              {/* Add checklist input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistInput}
                  onChange={(e) => setNewChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add a checklist item..."
                  className="input-field flex-1 text-xs py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistInput.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Checklist items list */}
              {todoItems.length > 0 && (
                <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                  {todoItems.map((todo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/80 group hover:border-indigo-200 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={todo.isCompleted}
                        onChange={(e) => {
                          const updated = [...todoItems];
                          updated[idx].isCompleted = e.target.checked;
                          setTodoItems(updated);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={todo.text}
                        onChange={(e) => updateTodoText(idx, e.target.value)}
                        className={`flex-1 text-xs bg-transparent focus:outline-none border-none p-0 ${
                          todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTodoItem(idx)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-1 text-xs transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

             {/* Assignee Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Assignee
                </span>
                {assignedTo === '' ? (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Open Task
                  </span>
                ) : (
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Assigned
                  </span>
                )}
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input-field w-full text-xs font-semibold py-2 px-3 bg-white cursor-pointer"
              >
                <option value="">-- Unassigned (Open Task) --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Metadata & Settings (1 col wide) */}
          <div className="space-y-4">
            {/* Project Selection */}
            {!defaultProjectId && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="input-field w-full text-xs font-semibold py-2 px-3 bg-white"
                  required
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`px-3 py-2 text-xs font-extrabold rounded-xl border transition-all ${
                      priority === p.value
                        ? p.color + ' ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date & Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field w-full text-xs py-2 px-3 bg-white mb-1.5"
                required
              />
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDueDate(preset.getValue())}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/60 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates & Recurrence */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field w-full text-xs py-1.5 px-2.5 bg-white"
                />
              </div>

              <div className="pt-1 border-t border-slate-200/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurrenceEnabled}
                    onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300"
                  />
                  <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                  Enable Recurrence
                </label>
                {recurrenceEnabled && (
                  <select
                    value={recurrenceFreq}
                    onChange={(e) => setRecurrenceFreq(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="input-field w-full text-xs py-1.5 px-2.5 mt-2 bg-white"
                  >
                    <option value="daily font-medium">Repeats Daily</option>
                    <option value="weekly font-medium">Repeats Weekly</option>
                    <option value="monthly font-medium">Repeats Monthly</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED OPTIONS TOGGLE & CONTENT */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Advanced Configuration
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" /> Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                    placeholder="e.g., Engineering, Design, Product"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                    placeholder="e.g., api, frontend, urgent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-slate-200/60">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span>Impact Score</span>
                    <span className="text-indigo-600 font-extrabold text-xs">{impactScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={impactScore}
                    onChange={(e) => setImpactScore(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Estimated Effort (hours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={effortHours}
                    onChange={(e) => setEffortHours(Number(e.target.value))}
                    className="input-field w-full text-xs py-1.5 bg-white"
                  />
                </div>
              </div>

              {goals.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Target className="w-3 h-3 text-indigo-600" /> Strategic Goal Alignment
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {goals.map((g) => (
                      <label
                        key={g._id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                          goalIds.includes(g._id)
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={goalIds.includes(g._id)}
                          onChange={() => handleGoalToggle(g._id)}
                          className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300"
                        />
                        <span className="text-xs truncate">{g.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default CreateTask;
