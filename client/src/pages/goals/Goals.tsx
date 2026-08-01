import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  Target,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  LayoutGrid,
  List,
  GitFork,
  Plus,
  User as UserIcon,
  ChevronRight,
  Folder,
  Layers,
} from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column } from '../../components/common/AdvancedTable';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import CreateGoal from './CreateGoal';
import type { Goal, GoalTimeframe, GoalStatus, GoalCategory, KeyResult } from '../../types';

const TIMEFRAMES: GoalTimeframe[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'];
const STATUSES: GoalStatus[] = ['Not Started', 'In Progress', 'On Track', 'At Risk', 'Behind', 'Completed', 'Closed'];
const CATEGORIES: GoalCategory[] = ['Company', 'Team', 'Individual'];

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

function Goals() {
  const { user, canAccessAdminSuite, hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // View Mode: 'grid' | 'table' | 'tree'
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'tree'>('grid');
  const [showCreateGoal, setShowCreateGoal] = useState(false);

  // Key Results map for Tree View
  const [goalKRsMap, setGoalKRsMap] = useState<Record<string, KeyResult[]>>({});

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.GOALS.LIST);
      const fetchedGoals: Goal[] = res.data?.data?.goals || [];
      setGoals(fetchedGoals);

      // Fetch Key Results for each goal to display progress & tree alignment accurately
      const krMap: Record<string, KeyResult[]> = {};
      await Promise.all(
        fetchedGoals.map(async (g) => {
          try {
            const krRes = await api.get(apiPaths.KEY_RESULTS.LIST, { params: { objectiveId: g._id } });
            krMap[g._id] = krRes.data?.data || [];
          } catch {
            krMap[g._id] = [];
          }
        })
      );
      setGoalKRsMap(krMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchesTimeframe = !timeframeFilter || g.timeframe === timeframeFilter;
      const matchesStatus = !statusFilter || (g.status || 'On Track') === statusFilter;
      const matchesCategory = !categoryFilter || (g.category || 'Company') === categoryFilter;
      const matchesSearch =
        !searchTerm ||
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.objective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.metric?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTimeframe && matchesStatus && matchesCategory && matchesSearch;
    });
  }, [goals, timeframeFilter, statusFilter, categoryFilter, searchTerm]);

  // Calculated Statistics for Overview Cards
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === 'Completed').length;
    const onTrack = goals.filter((g) => g.status === 'On Track' || g.status === 'In Progress' || !g.status).length;
    const atRiskOrBehind = goals.filter((g) => g.status === 'At Risk' || g.status === 'Behind').length;

    let totalProgressSum = 0;
    goals.forEach((g) => {
      const krs = goalKRsMap[g._id] || [];
      if (krs.length > 0) {
        const krAvg = Math.round(krs.reduce((sum, kr) => sum + (kr.progressPercent || 0), 0) / krs.length);
        totalProgressSum += krAvg;
      } else if (g.targetValue && g.targetValue > 0) {
        totalProgressSum += Math.min(100, Math.round(((g.currentValue || 0) / g.targetValue) * 100));
      }
    });

    const avgProgress = total > 0 ? Math.round(totalProgressSum / total) : 0;
    const onTrackPct = total > 0 ? Math.round(((onTrack + completed) / total) * 100) : 0;

    return { total, completed, onTrack, atRiskOrBehind, avgProgress, onTrackPct };
  }, [goals, goalKRsMap]);

  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Goals & OKRs"
      subtitle="Strategic objectives, key results, and outcome alignment map"
      actions={
        <div className="flex items-center gap-2">
          {hasPermission('goal:manage') && (
            <button
              type="button"
              onClick={() => setShowCreateGoal(true)}
              className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Goal
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {error && <div className="alert-error">{error}</div>}

        {/* Top KPI Statistics Overview Header */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>Total OKRs</span>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">Across all departments</div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.completed}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Achieved Objectives</div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>On Track</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.onTrackPct}%</div>
            <div className="text-[11px] text-blue-600 font-medium mt-1">{stats.onTrack} goals performing well</div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>At Risk / Behind</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.atRiskOrBehind}</div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Require check-in</div>
          </div>

          <div className="card p-4 col-span-2 sm:col-span-1">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold mb-1">
              <span>Avg Org Progress</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{stats.avgProgress}%</div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
                style={{ width: `${stats.avgProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls & Filter Toolbar with View Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex-1">
            <FilterToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search OKRs by objective, metric..."
              filters={[
                {
                  id: 'statusFilter',
                  label: 'Status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: '', label: 'All Statuses' },
                    ...STATUSES.map((s) => ({ value: s, label: s })),
                  ],
                },
                {
                  id: 'categoryFilter',
                  label: 'Category',
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                  options: [
                    { value: '', label: 'All Categories' },
                    ...CATEGORIES.map((c) => ({ value: c, label: c })),
                  ],
                },
                {
                  id: 'timeframeFilter',
                  label: 'Timeframe',
                  value: timeframeFilter,
                  onChange: setTimeframeFilter,
                  options: [
                    { value: '', label: 'All Timeframes' },
                    ...TIMEFRAMES.map((t) => ({ value: t, label: t })),
                  ],
                },
              ]}
            />
          </div>

          {/* View Switcher Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'tree'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Hierarchy Alignment View"
            >
              <GitFork className="w-4 h-4" />
              <span className="hidden sm:inline">Alignment</span>
            </button>
          </div>
        </div>

        {/* Content Views */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="card text-center py-16">
            <Zap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No OKRs found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {goals.length === 0
                ? 'Create your first goal to align team tasks with measurable business outcomes.'
                : 'No goals match your current filters.'}
            </p>
            {hasPermission('goal:manage') && goals.length === 0 && (
              <button
                type="button"
                onClick={() => setShowCreateGoal(true)}
                className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Goal
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((g) => {
              const krs = goalKRsMap[g._id] || [];
              let progress = 0;
              if (krs.length > 0) {
                progress = Math.round(krs.reduce((acc, k) => acc + (k.progressPercent || 0), 0) / krs.length);
              } else if (g.targetValue) {
                progress = Math.min(100, Math.round(((g.currentValue || 0) / g.targetValue) * 100));
              }

              const ownerName = typeof g.ownerId === 'object' && g.ownerId ? g.ownerId.name : 'Unassigned';

              return (
                <div
                  key={g._id}
                  onClick={() => navigate(`/goals/${g._id}`)}
                  className="card hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between p-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            GOAL_STATUS_COLORS[g.status] || GOAL_STATUS_COLORS['On Track']
                          }`}
                        >
                          {g.status || 'On Track'}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                            TIMEFRAME_COLORS[g.timeframe] || TIMEFRAME_COLORS.Custom
                          }`}
                        >
                          {g.timeframe}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {g.category || 'Company'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors line-clamp-2">
                        {g.title}
                      </h3>
                      {g.objective && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.objective}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                        <span className="text-[11px] font-medium text-slate-500">Progress</span>
                        <span className="font-bold text-slate-800 tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600 font-medium truncate max-w-[120px]">
                          {ownerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{krs.length} Key Results</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          (() => {
            const goalColumns: Column<Goal>[] = [
              {
                key: 'title',
                header: 'Title & Objective',
                sortable: true,
                render: (g) => (
                  <div>
                    <Link
                      to={`/goals/${g._id}`}
                      className="text-sm font-bold text-slate-800 hover:text-primary transition-colors block"
                    >
                      {g.title}
                    </Link>
                    {g.objective && (
                      <span className="text-xs text-slate-500 line-clamp-1 block mt-0.5">
                        {g.objective}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (g) => (
                  <span
                    className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      GOAL_STATUS_COLORS[g.status] || GOAL_STATUS_COLORS['On Track']
                    }`}
                  >
                    {g.status || 'On Track'}
                  </span>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                sortable: true,
                render: (g) => (
                  <span className="text-xs text-slate-600 font-medium">
                    {g.category || 'Company'}
                  </span>
                ),
              },
              {
                key: 'timeframe',
                header: 'Timeframe',
                sortable: true,
                render: (g) => (
                  <span
                    className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      TIMEFRAME_COLORS[g.timeframe] || TIMEFRAME_COLORS.Custom
                    }`}
                  >
                    {g.timeframe}
                  </span>
                ),
              },
              {
                key: 'progress',
                header: 'Progress',
                sortable: true,
                render: (g) => {
                  const krs = goalKRsMap[g._id] || [];
                  let pct = 0;
                  if (krs.length > 0) {
                    pct = Math.round(krs.reduce((a, b) => a + (b.progressPercent || 0), 0) / krs.length);
                  } else if (g.targetValue) {
                    pct = Math.min(100, Math.round(((g.currentValue || 0) / g.targetValue) * 100));
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">{pct}%</span>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[50px]',
                render: (g) => (
                  <RowActions
                    items={[
                      { label: 'View Details', onClick: () => navigate(`/goals/${g._id}`) },
                      { label: 'Edit Goal', onClick: () => navigate(`/goals/${g._id}/edit`) },
                    ]}
                  />
                ),
              },
            ];
            return (
              <AdvancedTable
                data={filteredGoals}
                columns={goalColumns}
                onRowClick={(g) => navigate(`/goals/${g._id}`)}
                emptyMessage="No goals match your filters."
                emptyIcon={<Zap className="w-12 h-12 text-slate-400 mx-auto mb-3" />}
              />
            );
          })()
        ) : (
          /* Tree View */
          <div className="space-y-4">
            {filteredGoals.map((g) => (
              <div key={g._id} className="card p-4">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <Link to={`/goals/${g._id}`} className="text-sm font-bold text-slate-800 hover:text-primary">
                      {g.title}
                    </Link>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${GOAL_STATUS_COLORS[g.status] || GOAL_STATUS_COLORS['On Track']}`}>
                    {g.status || 'On Track'}
                  </span>
                </div>

                <div className="pl-4 space-y-2 border-l-2 border-slate-200 ml-2">
                  {(goalKRsMap[g._id] || []).length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No Key Results added yet.</div>
                  ) : (
                    (goalKRsMap[g._id] || []).map((kr) => (
                      <div key={kr._id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                          <span className="font-semibold text-slate-700">{kr.title}</span>
                        </div>
                        <span className="font-bold text-slate-800">{kr.progressPercent || 0}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateGoal
        isOpen={showCreateGoal}
        onClose={() => setShowCreateGoal(false)}
        onCreated={fetchGoals}
      />
    </PageShell>
  );
}

export default Goals;
