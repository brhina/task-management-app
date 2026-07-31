import { useState, useEffect, useContext, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { GoalTimeframe, Project } from '../../types';

const TIMEFRAMES: {
  value: GoalTimeframe;
  label: string;
  desc: string;
  color: string;
  icon: string;
}[] = [
  {
    value: 'Weekly',
    label: 'Weekly',
    desc: '7-day sprint goals',
    color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: 'W',
  },
  {
    value: 'Monthly',
    label: 'Monthly',
    desc: '30-day milestones',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: 'M',
  },
  {
    value: 'Quarterly',
    label: 'Quarterly',
    desc: '90-day objectives',
    color: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    icon: 'Q',
  },
  {
    value: 'Yearly',
    label: 'Yearly',
    desc: 'Annual vision',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: 'Y',
  },
  {
    value: 'Custom',
    label: 'Custom',
    desc: 'Flexible timeline',
    color: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    icon: 'C',
  },
];

interface GoalResponse {
  goal: {
    _id: string;
    title: string;
    objective?: string;
    metric?: string;
    targetValue?: number;
    currentValue?: number;
    timeframe: GoalTimeframe;
  };
  linkedProjects: Project[];
  linkedTasks: { _id: string; title: string }[];
}

function EditGoal() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [metric, setMetric] = useState('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [currentValue, setCurrentValue] = useState<number | ''>('');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('Quarterly');
  const [saving, setSaving] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(apiPaths.GOALS.GET_BY_ID.replace(':id', id)).then((r) => {
        const data: GoalResponse = r.data.data || r.data;
        const goal = data.goal || data;
        setTitle(goal.title || '');
        setObjective(goal.objective || '');
        setMetric(goal.metric || '');
        setTargetValue(goal.targetValue ?? '');
        setCurrentValue(goal.currentValue ?? '');
        setTimeframe(goal.timeframe || 'Quarterly');
        setLinkedProjects(data.linkedProjects || []);
      }),
      api.get(apiPaths.PROJECTS.LIST).then((r) => setAllProjects(r.data?.data?.projects || [])),
    ])
      .catch((err: any) => {
        setError(err.response?.data?.message || 'Failed to load goal');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const availableProjects = allProjects.filter(
    (p) => !linkedProjects.some((lp) => lp._id === p._id)
  );

  const goalProgress =
    targetValue !== '' && currentValue !== '' && Number(targetValue) > 0
      ? Math.min(100, Math.round((Number(currentValue) / Number(targetValue)) * 100))
      : 0;

  const handleLinkProject = async (projectId: string) => {
    try {
      await api.post(apiPaths.GOALS.LINK_PROJECT.replace(':id', id || ''), { projectId });
      const project = allProjects.find((p) => p._id === projectId);
      if (project) setLinkedProjects((prev) => [...prev, project]);
      setShowLinkDropdown(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to link project');
    }
  };

  const handleUnlinkProject = async (projectId: string) => {
    try {
      await api.post(apiPaths.GOALS.UNLINK_PROJECT.replace(':id', id || ''), { projectId });
      setLinkedProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unlink project');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Goal title is required');

    try {
      setSaving(true);
      setError('');
      await api.put(apiPaths.GOALS.UPDATE.replace(':id', id || ''), {
        title: title.trim(),
        objective: objective.trim(),
        metric: metric.trim(),
        timeframe,
        targetValue: targetValue === '' ? undefined : Number(targetValue),
        currentValue: currentValue === '' ? undefined : Number(currentValue),
      });
      navigate(`/goals/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update goal');
    } finally {
      setSaving(false);
    }
  };
  if (!user || !canAccessAdminSuite()) {
    return <PageShell title="Access Denied" subtitle="Admin only." />;
  }

  if (loading) {
    return (
      <PageShell title="Edit Goal" subtitle="Loading goal...">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Loading goal data..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Edit Goal"
      subtitle="Update goal details"
      actions={
        <Link
          to={`/goals/${id}`}
          className="block px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
        >
          Back to Goal
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-7xl space-y-4">
        {error && <div className="alert-error">{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Goal Title *
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full text-base"
              placeholder="What do you want to achieve?"
              autoFocus
            />
          </div>

          <div className="card">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Objective
            </div>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="input-field w-full text-sm resize-none"
              placeholder="Why does this matter? What's the business impact?"
            />
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Timeframe
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeframe(t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  timeframe === t.value
                    ? t.color + ' ring-1 ring-white/15'
                    : 'border-gray-200 text-slate-500 hover:text-slate-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                      timeframe === t.value ? 'bg-white/10' : 'bg-white'
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span className="text-xs font-semibold">{t.label}</span>
                </div>
                <div className="text-[10px] opacity-70">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Measurement
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Metric</div>
              <input
                type="text"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="e.g., Avg onboarding days, Revenue, NPS score"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Target Value
              </div>
              <input
                type="number"
                min={0}
                value={targetValue}
                onChange={(e) =>
                  setTargetValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="input-field w-full text-sm"
                placeholder="e.g., 7"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="sm:col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Current Value
              </div>
              <input
                type="number"
                min={0}
                value={currentValue}
                onChange={(e) =>
                  setCurrentValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="input-field w-full text-sm"
                placeholder="Current progress value"
              />
            </div>
            <div className="flex items-end">
              {targetValue !== '' && currentValue !== '' && (
                <div className="w-full p-3 rounded-lg bg-white/50 border border-gray-200/50">
                  <div className="text-xs text-slate-500 mb-1">Progress</div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-700">{goalProgress}%</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Linked Projects
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLinkDropdown(!showLinkDropdown)}
                className="text-xs text-primary hover:text-primary-hover font-medium disabled:opacity-50"
                disabled={!hasPermission('goal:manage')}
              >
                + Add Project
              </button>
              {showLinkDropdown && (
                <div className="absolute right-0 top-8 z-10 w-64 card border border-gray-200 shadow-lg">
                  {availableProjects.length === 0 ? (
                    <div className="text-xs text-slate-500 p-2">No available projects</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableProjects.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => handleLinkProject(p._id)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-gray-200/50 rounded-lg transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {linkedProjects.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No projects linked yet</div>
          ) : (
            <div className="space-y-1.5">
              {linkedProjects.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white/50"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-600 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.status}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlinkProject(p._id)}
                    className="text-rose-400 hover:text-rose-300 text-xs shrink-0 ml-2 disabled:opacity-50"
                    disabled={!hasPermission('goal:manage')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Link to={`/goals/${id}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !hasPermission('goal:manage')}
            className="btn-primary disabled:opacity-50 min-w-[140px]"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Updating...
              </span>
            ) : (
              'Update Goal'
            )}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

export default EditGoal;
