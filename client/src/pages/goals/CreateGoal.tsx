import { useContext, useState, useEffect, type FormEvent } from 'react';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import Modal from '../../components/common/Modal';
import type { GoalTimeframe } from '../../types';

const TIMEFRAMES: {
  value: GoalTimeframe;
  label: string;
  desc: string;
  color: string;
  icon: string;
}[] = [
  { value: 'Weekly', label: 'Weekly', desc: '7-day sprint goals', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', icon: 'W' },
  { value: 'Monthly', label: 'Monthly', desc: '30-day milestones', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: 'M' },
  { value: 'Quarterly', label: 'Quarterly', desc: '90-day objectives', color: 'bg-violet-500/15 text-violet-400 border-violet-500/30', icon: 'Q' },
  { value: 'Yearly', label: 'Yearly', desc: 'Annual vision', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: 'Y' },
  { value: 'Custom', label: 'Custom', desc: 'Flexible timeline', color: 'bg-slate-500/15 text-slate-500 border-slate-500/30', icon: 'C' },
];

interface CreateGoalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function CreateGoal({ isOpen, onClose, onCreated }: CreateGoalProps) {
  const { hasPermission } = useContext(UserContext);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [metric, setMetric] = useState('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('Quarterly');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setObjective('');
      setMetric('');
      setTargetValue('');
      setTimeframe('Quarterly');
      setError('');
    }
  }, [isOpen]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Goal title is required');

    try {
      setCreating(true);
      setError('');
      await api.post(apiPaths.GOALS.CREATE, {
        title: title.trim(),
        objective: objective.trim(),
        metric: metric.trim(),
        timeframe,
        targetValue: targetValue === '' ? undefined : Number(targetValue),
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goal"
      subtitle="Define a measurable objective for your team"
      maxWidth="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="create-goal-form"
            disabled={creating || !hasPermission('goal:manage')}
            className="btn-primary disabled:opacity-50 min-w-[140px]"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Goal'
            )}
          </button>
        </>
      }
    >
      <form id="create-goal-form" onSubmit={handleCreate} className="space-y-4">
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
                onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-field w-full text-sm"
                placeholder="e.g., 7"
              />
            </div>
          </div>
          {metric && targetValue !== '' && (
            <div className="mt-3 p-3 rounded-lg bg-white/50 border border-gray-200/50">
              <div className="text-xs text-slate-500">Goal preview</div>
              <div className="text-sm text-slate-700 mt-1">
                Achieve <span className="font-semibold text-primary">{metric}</span> ={' '}
                <span className="font-semibold text-primary">{targetValue}</span> within{' '}
                <span className="font-semibold">{timeframe.toLowerCase()}</span> timeframe
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default CreateGoal;
