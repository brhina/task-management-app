import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { Goal, GoalTimeframe } from '../../types';

const TIMEFRAMES: GoalTimeframe[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'];

const TIMEFRAME_COLORS: Record<string, string> = {
  Weekly: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Monthly: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Quarterly: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Yearly: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Custom: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const TIMEFRAME_ICONS: Record<string, string> = {
  Weekly: 'W',
  Monthly: 'M',
  Quarterly: 'Q',
  Yearly: 'Y',
  Custom: 'C',
};

function Goals() {
  const { user, getEffectiveRole } = useContext(UserContext);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.GOALS.LIST);
      setGoals(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const timeframeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of goals) counts[g.timeframe] = (counts[g.timeframe] || 0) + 1;
    return counts;
  }, [goals]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchesTimeframe = !timeframeFilter || g.timeframe === timeframeFilter;
      const matchesSearch =
        !searchTerm ||
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.objective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.metric?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTimeframe && matchesSearch;
    });
  }, [goals, timeframeFilter, searchTerm]);

  const effectiveRole = getEffectiveRole();
  if (!user || effectiveRole !== 'OrgAdmin') {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Goals (OKRs)"
      subtitle="Align projects and tasks to measurable outcomes"
      actions={
        <div className="flex gap-2">
          <Link to="/admin/goals/create" className="btn-primary">
            Create Goal
          </Link>
          <button type="button" className="btn-secondary" onClick={fetchGoals}>
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

        {/* Timeframe Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframeFilter(timeframeFilter === t ? '' : t)}
              className={`card text-left transition-all ${
                timeframeFilter === t
                  ? 'ring-2 ring-primary/50 border-primary/40'
                  : 'hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold border ${TIMEFRAME_COLORS[t]}`}
                >
                  {TIMEFRAME_ICONS[t]}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {t}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-100 tabular-nums">
                {timeframeCounts[t] || 0}
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${goals.length ? ((timeframeCounts[t] || 0) / goals.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <FilterToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search goals by title, objective, or metric..."
          filters={[
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

        {/* Goals Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="w-12 h-12 text-slate-600 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div className="text-slate-400 text-sm">
              {goals.length === 0
                ? 'No goals yet. Create your first OKR to get started.'
                : 'No goals match your filters.'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredGoals.map((g) => {
              const progress = g.targetValue
                ? Math.min(100, Math.round(((g.currentValue || 0) / g.targetValue) * 100))
                : null;

              return (
                <Link
                  key={g._id}
                  to={`/admin/goals/${g._id}`}
                  className="card group hover:border-primary/40 transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${TIMEFRAME_COLORS[g.timeframe] || TIMEFRAME_COLORS.Custom}`}
                    >
                      {g.timeframe}
                    </span>
                    <svg
                      className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors mb-1">
                    {g.title}
                  </h3>

                  {g.objective && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{g.objective}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-slate-700/50">
                    {progress !== null ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">
                            {g.metric || 'Progress'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
                          {g.currentValue ?? 0} / {g.targetValue}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500">
                        {g.metric || 'No metric set'}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default Goals;
