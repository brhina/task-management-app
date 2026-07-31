import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight } from 'lucide-react';
import PageShell from '../../components/common/PageShell';
import FilterToolbar from '../../components/common/FilterToolbar';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import CreateGoal from './CreateGoal';
import type { Goal, GoalTimeframe } from '../../types';

const TIMEFRAMES: GoalTimeframe[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'];

const TIMEFRAME_COLORS: Record<string, string> = {
  Weekly: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Monthly: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Quarterly: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Yearly: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Custom: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

const TIMEFRAME_ICONS: Record<string, string> = {
  Weekly: 'W',
  Monthly: 'M',
  Quarterly: 'Q',
  Yearly: 'Y',
  Custom: 'C',
};

function Goals() {
  const { user, canAccessAdminSuite } = useContext(UserContext);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGoal, setShowCreateGoal] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(apiPaths.GOALS.LIST);
      setGoals(res.data?.data?.goals || []);
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
      const matchesSearch =
        !searchTerm ||
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.objective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.metric?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTimeframe && matchesSearch;
    });
  }, [goals, timeframeFilter, searchTerm]);
  if (!user || !canAccessAdminSuite()) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  return (
    <PageShell
      title="Goals (OKRs)"
      subtitle="Align projects and tasks to measurable outcomes"
      actions={
        <>
          <button
            type="button"
            onClick={() => setShowCreateGoal(true)}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Create Goal
          </button>
          <button
            type="button"
            onClick={fetchGoals}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Refresh
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="alert-error">{error}</div>}

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

        {/* Goals Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          (() => {
            const goalColumns: Column<Goal>[] = [
              {
                key: 'title',
                header: 'Title',
                sortable: true,
                render: (g) => (
                  <Link to={`/goals/${g._id}`} className="text-sm font-semibold text-slate-700 hover:text-primary transition-colors">
                    {g.title}
                  </Link>
                ),
              },
              {
                key: 'timeframe',
                header: 'Timeframe',
                sortable: true,
                render: (g) => (
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${TIMEFRAME_COLORS[g.timeframe] || TIMEFRAME_COLORS.Custom}`}>
                    {g.timeframe}
                  </span>
                ),
              },
              {
                key: 'objective',
                header: 'Objective',
                render: (g) => (
                  <span className="text-sm text-slate-700 line-clamp-1 max-w-xs block">
                    {g.objective || '—'}
                  </span>
                ),
              },
              {
                key: 'progress',
                header: 'Progress',
                sortable: true,
                render: (g) => {
                  const progress = g.targetValue
                    ? Math.min(100, Math.round(((g.currentValue || 0) / g.targetValue) * 100))
                    : null;
                  return progress !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 tabular-nums">{progress}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">{g.metric || 'No metric'}</span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[50px]',
                render: (g) => (
                  <RowActions items={[
                    { label: 'View', onClick: () => window.location.href = `/goals/${g._id}` },
                  ]} />
                ),
              },
            ];
            return (
              <AdvancedTable
                data={filteredGoals}
                columns={goalColumns}
                onRowClick={(g) => window.location.href = `/goals/${g._id}`}
                emptyMessage={goals.length === 0 ? 'No goals yet. Create your first OKR to get started.' : 'No goals match your filters.'}
                emptyIcon={<Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
              />
            );
          })()
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
