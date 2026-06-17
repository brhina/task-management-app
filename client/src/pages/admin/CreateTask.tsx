import { useState, useEffect, useContext, useMemo, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import PageShell from '../../components/common/PageShell';
import type { Goal, Project, User } from '../../types';

interface TodoItem {
    text: string;
    isCompleted: boolean;
}

const PRIORITY_OPTIONS = [
    { value: 'Low', label: 'Low', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
    { value: 'Medium', label: 'Medium', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    { value: 'High', label: 'High', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    { value: 'Critical', label: 'Critical', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

const DATE_PRESETS = [
    { label: 'Today', getValue: () => { const d = new Date(); d.setHours(18, 0, 0, 0); return d.toISOString().slice(0, 16); } },
    { label: 'Tomorrow', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d.toISOString().slice(0, 16); } },
    { label: 'This Week', getValue: () => { const d = new Date(); d.setDate(d.getDate() + (5 - d.getDay())); d.setHours(18, 0, 0, 0); return d.toISOString().slice(0, 16); } },
    { label: 'Next Week', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(18, 0, 0, 0); return d.toISOString().slice(0, 16); } },
    { label: 'In 2 Weeks', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 14); d.setHours(18, 0, 0, 0); return d.toISOString().slice(0, 16); } },
];

function CreateTask() {
    const { user, getEffectiveRole } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlProjectId = searchParams.get('projectId') || '';

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
    const [projectId, setProjectId] = useState(urlProjectId);
    const [goalIds, setGoalIds] = useState<string[]>([]);
    const [tags, setTags] = useState('');
    const [category, setCategory] = useState('');
    const [impactScore, setImpactScore] = useState(5);
    const [effortHours, setEffortHours] = useState(1);
    const [todoItems, setTodoItems] = useState<TodoItem[]>([]);

    const scopedProject = useMemo(() => projects.find(p => p._id === projectId), [projects, projectId]);

    useEffect(() => {
        Promise.all([
            api.get(apiPaths.USERS.GET_ALL_USERS).then(r => setUsers(r.data)),
            api.get(apiPaths.PROJECTS.LIST).then(r => setProjects(r.data?.data || [])),
            api.get(apiPaths.GOALS.LIST).then(r => setGoals(r.data?.data || [])),
        ]).catch(() => {});
    }, []);

    const handleGoalToggle = (goalId: string) => {
        setGoalIds(prev => prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]);
    };

    const addTodoItem = () => setTodoItems(prev => [...prev, { text: '', isCompleted: false }]);
    const removeTodoItem = (index: number) => setTodoItems(prev => prev.filter((_, i) => i !== index));
    const updateTodoText = (index: number, text: string) => {
        const updated = [...todoItems];
        updated[index] = { ...updated[index], text };
        setTodoItems(updated);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return setError('Title is required');
        if (!dueDate) return setError('Due date is required');
        if (!assignedTo) return setError('Please assign to a user');
        if (!projectId) return setError('Please select a project');

        setLoading(true);
        setError('');
        try {
            await api.post(apiPaths.TASKS.CREATE_TASK, {
                title: title.trim(),
                description: description.trim(),
                priority,
                dueDate,
                assignedTo,
                projectId: projectId || undefined,
                goalIds: goalIds.length > 0 ? goalIds : undefined,
                tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                category: category.trim() || undefined,
                impactScore,
                effortHours,
                todoCheckList: todoItems.filter(item => item.text.trim()),
            });
            navigate(projectId ? `/admin/manage-tasks?projectId=${projectId}` : '/admin/manage-tasks');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    const effectiveRole = getEffectiveRole();
    if (!user || effectiveRole !== 'OrgAdmin') {
        return <PageShell title="Access Denied" subtitle="Admin only." />;
    }

    return (
        <PageShell
            title={scopedProject ? `New Task in ${scopedProject.name}` : 'Create Task'}
            subtitle={scopedProject ? scopedProject.description || 'Adding a task to this project' : 'Fill in the details below'}
            actions={
                <div className="flex gap-2">
                    <Link to={projectId ? `/admin/manage-tasks?projectId=${projectId}` : '/admin/projects'} className="btn-secondary">Cancel</Link>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="max-w-7xl space-y-4">
                {error && <div className="alert-error">{error}</div>}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* Project Selector (when not scoped) */}
                    {!urlProjectId && (
                        <div className="card">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Project *</div>
                            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-dark w-full text-sm" required>
                                <option value="">Select a project</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Title */}
                    <div className="card">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Title *</div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input-dark w-full text-base"
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                    </div>
                    <div className="card">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="input-dark w-full text-sm resize-none"
                        placeholder="Add details, context, or acceptance criteria..."
                    />
                </div>
                </div>
                {/* Description */}
                

                {/* Priority & Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Priority */}
                    <div className="card">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Priority</div>
                        <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPriority(p.value)}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                        priority === p.value
                                            ? p.color + ' ring-1 ring-white/15'
                                            : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="card">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Due Date *</div>
                        <input
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="input-dark w-full text-sm mb-2"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {DATE_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => setDueDate(preset.getValue())}
                                    className="px-2 py-1 text-[10px] font-medium rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Assignee */}
                <div className="card">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Assign To *</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {users.map(u => (
                            <button
                                key={u._id}
                                type="button"
                                onClick={() => setAssignedTo(u._id)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                                    assignedTo === u._id
                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                                }`}
                            >
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                    assignedTo === u._id ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'
                                }`}>
                                    <span className="text-xs font-semibold">{u.name?.charAt(0).toUpperCase() || '?'}</span>
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-xs font-medium truncate ${assignedTo === u._id ? 'text-primary' : 'text-slate-300'}`}>
                                        {u.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                                </div>
                                {assignedTo === u._id && (
                                    <svg className="w-4 h-4 ml-auto text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Checklist */}
                <div className="card">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Checklist</div>
                        <button type="button" onClick={addTodoItem} className="text-xs text-primary hover:text-primary-hover font-medium">
                            + Add Item
                        </button>
                    </div>
                    {todoItems.length === 0 ? (
                        <button type="button" onClick={addTodoItem} className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-xs text-slate-500 hover:border-primary/50 hover:text-primary transition-colors">
                            + Add checklist items
                        </button>
                    ) : (
                        <div className="space-y-1.5">
                            {todoItems.map((todo, idx) => (
                                <div key={idx} className="flex items-center gap-2 group">
                                    <div className="h-4 w-4 rounded border border-slate-600 shrink-0" />
                                    <input
                                        type="text"
                                        value={todo.text}
                                        onChange={(e) => updateTodoText(idx, e.target.value)}
                                        className="flex-1 input-dark text-sm py-1.5"
                                        placeholder="Checklist item..."
                                        autoFocus={idx === todoItems.length - 1}
                                    />
                                    <button type="button" onClick={() => removeTodoItem(idx)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 text-xs transition-opacity">
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Advanced Options */}
                <div className="card">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wide"
                    >
                        <span>Advanced Options</span>
                        <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showAdvanced && (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Category</div>
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input-dark w-full text-sm"
                                        placeholder="e.g., Product, Engineering"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Tags (comma-separated)</div>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        className="input-dark w-full text-sm"
                                        placeholder="e.g., api, urgent, onboarding"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Impact (0-10)</div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={10}
                                        value={impactScore}
                                        onChange={(e) => setImpactScore(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="text-center text-xs font-bold text-slate-300 mt-1">{impactScore}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Effort (hours)</div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={effortHours}
                                        onChange={(e) => setEffortHours(Number(e.target.value))}
                                        className="input-dark w-full text-sm"
                                    />
                                </div>
                            </div>

                            {goals.length > 0 && (
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Goal Alignment</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {goals.slice(0, 8).map(g => (
                                            <label key={g._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={goalIds.includes(g._id)}
                                                    onChange={() => handleGoalToggle(g._id)}
                                                    className="h-3.5 w-3.5"
                                                />
                                                <span className="text-xs text-slate-300 truncate">{g.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-2">
                    {/* <Link to={projectId ? `/admin/manage-tasks?projectId=${projectId}` : '/admin/manage-tasks'} className="btn-secondary">
                        Cancel
                    </Link> */}
                    <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50 min-w-[140px]">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Creating...
                            </span>
                        ) : 'Create Task'}
                    </button>
                </div>
            </form>
        </PageShell>
    );
}

export default CreateTask;
