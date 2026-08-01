import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Folder, ChevronRight, ClipboardList, Target, User as UserIcon, Plus, CheckCircle2, Pencil, ArrowLeft, CornerDownRight } from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import { getStatusColor, getPriorityColor } from '../../constants/taskStatus';
import KeyResultCheckInModal from '../../components/goals/KeyResultCheckInModal';
import OKRTreeVisualizer from '../../components/goals/OKRTreeVisualizer';
import type { Goal, Project, Task, KeyResult, KeyResultUnit } from '../../types';

const TIMEFRAME_COLORS: Record<string, string> = {
  Weekly: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Monthly: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Quarterly: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Yearly: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Custom: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

const GOAL_STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-300',
  'In Progress': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  'On Track': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  'At Risk': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  Behind: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  Completed: 'bg-emerald-600/20 text-emerald-700 border-emerald-600/40',
  Closed: 'bg-gray-200 text-gray-700 border-gray-300',
};

function GoalDetails() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [selectedKRForCheckIn, setSelectedKRForCheckIn] = useState<KeyResult | null>(null);

  // Add KR state
  const [krTitle, setKrTitle] = useState('');
  const [krTarget, setKrTarget] = useState(100);
  const [krStart, setKrStart] = useState(0);
  const [krMetric, setKrMetric] = useState('');
  const [krUnit, setKrUnit] = useState<KeyResultUnit>('percentage');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const [res, krRes] = await Promise.all([
        api.get(apiPaths.GOALS.GET_BY_ID.replace(':id', id || '')),
        api.get(apiPaths.KEY_RESULTS.LIST, { params: { objectiveId: id } }),
      ]);
      setGoal(res.data?.data?.goal || null);
      setLinkedProjects(res.data?.data?.linkedProjects || []);
      setLinkedTasks(res.data?.data?.linkedTasks || []);
      setKeyResults(krRes.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const addKeyResult = async () => {
    if (!krTitle.trim() || !id) return;
    try {
      await api.post(apiPaths.KEY_RESULTS.CREATE, {
        objectiveId: id,
        title: krTitle.trim(),
        metric: krMetric || undefined,
        unit: krUnit,
        startValue: krStart,
        targetValue: krTarget,
        currentValue: krStart,
      });
      setKrTitle('');
      setKrMetric('');
      setKrTarget(100);
      setKrStart(0);
      fetchDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create Key Result');
    }
  };

  const [deleteKrModal, setDeleteKrModal] = useState<{
    isOpen: boolean;
    krId: string;
  }>({
    isOpen: false,
    krId: '',
  });

  const deleteKeyResult = (krId: string) => {
    setDeleteKrModal({ isOpen: true, krId });
  };

  const confirmDeleteKeyResult = async () => {
    if (!deleteKrModal.krId) return;
    try {
      await api.delete(apiPaths.KEY_RESULTS.DELETE.replace(':id', deleteKrModal.krId));
      setKeyResults((prev) => prev.filter((k) => k._id !== deleteKrModal.krId));
      fetchDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete Key Result');
    } finally {
      setDeleteKrModal({ isOpen: false, krId: '' });
    }
  };

  const taskStats = useMemo(() => {
    const total = linkedTasks.length;
    const completed = linkedTasks.filter((t) => t.status === 'Completed').length;
    const inProgress = linkedTasks.filter((t) => t.status === 'In Progress').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, progress };
  }, [linkedTasks]);

  const goalProgress = useMemo(() => {
    if (keyResults.length > 0) {
      const totalPct = keyResults.reduce((acc, kr) => acc + (kr.progressPercent || 0), 0);
      return Math.round(totalPct / keyResults.length);
    }
    if (!goal?.targetValue) return null;
    return Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetValue) * 100));
  }, [goal, keyResults]);

  if (!user || !canAccessAdminSuite()) {
    return <PageShell title="Access Denied" subtitle="Admin permission required." />;
  }

  if (loading) {
    return (
      <PageShell title="Goal Details" subtitle="Loading objective data...">
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageShell>
    );
  }

  if (error || !goal) {
    return <PageShell title="Goal" subtitle={error || 'Goal not found'} />;
  }

  const ownerName = typeof goal.ownerId === 'object' && goal.ownerId ? goal.ownerId.name : 'Unassigned';

  return (
    <PageShell
      title={goal.title}
      subtitle={
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span
            className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              GOAL_STATUS_COLORS[goal.status] || GOAL_STATUS_COLORS['On Track']
            }`}
          >
            {goal.status || 'On Track'}
          </span>
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${
              TIMEFRAME_COLORS[goal.timeframe] || TIMEFRAME_COLORS.Custom
            }`}
          >
            {goal.timeframe}
          </span>
          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {goal.category || 'Company'}
          </span>
          {goal.objective && <span className="text-slate-500 text-sm ml-1">• {goal.objective}</span>}
        </div>
      }
      actions={
        <div className="flex flex-col gap-1 p-1">
          <Link
            to={`/goals/${id}/edit`}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4 text-slate-500" />
            Edit Goal
          </Link>
          <Link
            to="/goals"
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            Back to Goals
          </Link>
        </div>
      }
    >
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Goal Progress Banner */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Overall OKR Completion
                </span>
              </div>
              <span className="text-2xl font-black tabular-nums text-slate-800">
                {goalProgress !== null ? `${goalProgress}%` : 'N/A'}
              </span>
            </div>

            <div className="h-3 rounded-full bg-slate-100 overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${goalProgress || 0}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>{keyResults.length} Active Key Results</span>
              <span>
                {goal.targetValue ? `Metric Target: ${goal.currentValue || 0} / ${goal.targetValue}` : 'KR Weighted Average'}
              </span>
            </div>
          </div>

          {/* Key Results Section */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Key Results ({keyResults.length})
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {keyResults.map((kr) => {
                const krPct = kr.progressPercent ?? 0;
                return (
                  <div
                    key={kr._id}
                    className="border border-slate-200/80 rounded-xl p-4 bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{kr.title}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          {kr.metric && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              Metric: {kr.metric}
                            </span>
                          )}
                          <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-[11px] font-medium uppercase">
                            {kr.unit || 'percentage'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedKRForCheckIn(kr)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                        >
                          Check in
                        </button>
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-rose-500 disabled:opacity-50 p-1"
                          onClick={() => deleteKeyResult(kr._id)}
                          disabled={!hasPermission('goal:manage')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>
                          Current: {kr.currentValue ?? 0} / Target: {kr.targetValue ?? 100}
                        </span>
                        <span className="font-bold text-slate-800">{krPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${krPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Key Result Form */}
            {hasPermission('goal:manage') && (
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-600 mb-2">Add New Key Result</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    className="input-field text-sm sm:col-span-2"
                    placeholder="Key result outcome title *"
                    value={krTitle}
                    onChange={(e) => setKrTitle(e.target.value)}
                  />
                  <input
                    className="input-field text-sm"
                    placeholder="Metric name (e.g., NPS)"
                    value={krMetric}
                    onChange={(e) => setKrMetric(e.target.value)}
                  />
                  <select
                    className="input-field text-sm"
                    value={krUnit}
                    onChange={(e) => setKrUnit(e.target.value as KeyResultUnit)}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="currency">Currency ($)</option>
                    <option value="number">Numeric (#)</option>
                    <option value="boolean">Boolean (Yes/No)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span>Target:</span>
                    <input
                      type="number"
                      className="input-field text-xs w-20 py-1"
                      value={krTarget}
                      onChange={(e) => setKrTarget(Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-xs ml-auto flex items-center gap-1 py-1.5"
                    onClick={addKeyResult}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Key Result
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OKR Alignment Tree */}
          <OKRTreeVisualizer
            goal={goal}
            keyResults={keyResults}
            linkedProjects={linkedProjects}
            linkedTasks={linkedTasks}
            onCheckInKR={(kr) => setSelectedKRForCheckIn(kr)}
          />

          {/* Linked Projects Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Linked Projects ({linkedProjects.length})
              </div>
            </div>
            {linkedProjects.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
                <Folder className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <div className="text-xs text-slate-500">No projects linked to this goal</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {linkedProjects.map((p) => (
                  <Link
                    key={p._id}
                    to={`/tasks?projectId=${p._id}`}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-primary truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.status}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Linked Tasks Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Linked Tasks ({linkedTasks.length})
              </div>
            </div>
            {linkedTasks.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
                <ClipboardList className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <div className="text-xs text-slate-500">No tasks linked directly to this goal</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {linkedTasks.map((t) => (
                  <Link
                    key={t._id}
                    to={
                      t.parentTaskId
                        ? `/tasks/${
                            typeof t.parentTaskId === 'object'
                              ? (t.parentTaskId as any)._id
                              : t.parentTaskId
                          }?subtaskId=${t._id}`
                        : `/tasks/${t._id}`
                    }
                    className={`flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors group ${t.parentTaskId ? 'ml-4 pl-3 border-l-2 border-indigo-400/40 bg-slate-50/50' : ''}`}
                  >
                    {t.parentTaskId && (
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.parentTaskId && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider shrink-0">
                            Subtask
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-primary truncate">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Goal Overview Card */}
          <div className="card space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Goal Overview
            </div>

            <div className="space-y-2.5 divide-y divide-gray-100">
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className={`px-2 py-0.5 font-semibold rounded-full border ${GOAL_STATUS_COLORS[goal.status] || GOAL_STATUS_COLORS['On Track']}`}>
                  {goal.status || 'On Track'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-700">{goal.category || 'Company'}</span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Timeframe</span>
                <span className={`px-2 py-0.5 font-semibold rounded-full border ${TIMEFRAME_COLORS[goal.timeframe] || TIMEFRAME_COLORS.Custom}`}>
                  {goal.timeframe}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Owner</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ownerName}</span>
                </div>
              </div>

              {goal.metric && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target Metric</span>
                  <span className="font-semibold text-slate-700">{goal.metric}</span>
                </div>
              )}

              {goal.targetValue != null && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target Value</span>
                  <span className="font-bold text-slate-800">{goal.targetValue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Task Progress Summary */}
          {linkedTasks.length > 0 && (
            <div className="card">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Task Completion Meter
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${taskStats.progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 tabular-nums">
                  {taskStats.progress}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {taskStats.completed} of {taskStats.total} linked tasks completed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Check In Modal */}
      <KeyResultCheckInModal
        isOpen={Boolean(selectedKRForCheckIn)}
        onClose={() => setSelectedKRForCheckIn(null)}
        keyResult={selectedKRForCheckIn}
        onUpdated={fetchDetails}
      />

      <ConfirmModal
        isOpen={deleteKrModal.isOpen}
        onClose={() => setDeleteKrModal({ isOpen: false, krId: '' })}
        onConfirm={confirmDeleteKeyResult}
        title="Delete Key Result"
        message="Are you sure you want to delete this Key Result? This action cannot be undone."
      />
    </PageShell>
  );
}

export default GoalDetails;
