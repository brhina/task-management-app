import { useContext, useEffect, useMemo, useState } from 'react';
import { Download, Filter, ScrollText, ShieldAlert, Users, Activity, Search, RefreshCw, Layers, X } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import PageShell from '../../components/common/PageShell';
import StatCard from '../../components/common/StatCard';
import AdvancedTable, { type Column } from '../../components/common/AdvancedTable';
import axios from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface AuditEntry {
  _id: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actorId?: { name?: string; email?: string };
  ip?: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  update: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  delete: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  login: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  invite: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
};

const getActionColor = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower.includes('add')) return ACTION_COLORS.create;
  if (lower.includes('delete') || lower.includes('remove')) return ACTION_COLORS.delete;
  if (lower.includes('login') || lower.includes('auth')) return ACTION_COLORS.login;
  if (lower.includes('invite')) return ACTION_COLORS.invite;
  return ACTION_COLORS.update;
};

const AuditLogPage = () => {
  const { hasPermission } = useContext(UserContext);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canView = hasPermission('org:audit');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '40');
      if (filters.action) params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      const res = await axios.get(`${apiPaths.AUDIT.LIST}?${params.toString()}`);
      setLogs(res.data.data || []);
      setPages(res.data.pagination?.pages || 1);
      setTotalCount(res.data.pagination?.total || (res.data.data || []).length);
      setActions(res.data.filters?.actions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchLogs();
    else setLoading(false);
  }, [canView, page, filters.action, filters.startDate, filters.endDate]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => {
      const actorName = log.actorId?.name?.toLowerCase() || '';
      const actorEmail = log.actorId?.email?.toLowerCase() || '';
      const action = log.action.toLowerCase();
      const targetType = log.targetType.toLowerCase();
      return (
        actorName.includes(term) ||
        actorEmail.includes(term) ||
        action.includes(term) ||
        targetType.includes(term)
      );
    });
  }, [logs, searchTerm]);

  const stats = useMemo(() => {
    const uniqueActors = new Set(logs.map((l) => l.actorId?.email).filter(Boolean)).size;
    const uniqueActions = new Set(logs.map((l) => l.action)).size;
    return { uniqueActors, uniqueActions };
  }, [logs]);

  if (!canView) {
    return <PageShell title="Access Denied" subtitle="You need org:audit permission to view audit logs." />;
  }

  const exportLogs = async (format: 'xlsx' | 'csv') => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (format === 'csv') params.set('format', 'csv');
      const res = await axios.get(`${apiPaths.AUDIT.EXPORT}?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type:
          format === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    }
  };

  return (
    <PageShell
      title="Audit Log"
      subtitle="Comprehensive security activity and organizational audit history"
      actions={
        <div className="flex flex-col gap-1 p-1">
          <button
            type="button"
            onClick={fetchLogs}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
          <button
            type="button"
            onClick={() => exportLogs('csv')}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Log (CSV)
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <div className="alert-error">{error}</div>}

        {/* KPI Overview Summary Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard
            title="Total Audit Events"
            value={totalCount || logs.length}
            icon={ScrollText}
            colorTheme="slate"
            subtext="Recorded activities"
          />
          <StatCard
            title="Unique Actions"
            value={stats.uniqueActions}
            icon={Layers}
            colorTheme="violet"
            subtext="Distinct event types"
          />
          <StatCard
            title="Active Actors"
            value={stats.uniqueActors}
            icon={Users}
            colorTheme="emerald"
            subtext="Users & System actors"
          />
          <StatCard
            title="Audit Status"
            value="Active Monitoring"
            valueClassName="text-xs font-bold text-emerald-600 flex items-center gap-1.5"
            badge={<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            icon={Activity}
            colorTheme="blue"
            subtext="Real-time log capture"
          />
        </div>

        {/* Filter Toolbar & Export Section */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by actor, action name, or target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => exportLogs('xlsx')}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => exportLogs('csv')}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Action & Date Range Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, action: e.target.value });
                }}
                className="input-field w-full text-xs"
              >
                <option value="">All Action Types</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, startDate: e.target.value });
                }}
                className="input-field w-full text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, endDate: e.target.value });
                }}
                className="input-field w-full text-xs"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <AdvancedTable
              data={filteredLogs}
              columns={[
                {
                  key: 'createdAt',
                  header: 'Timestamp',
                  sortable: true,
                  render: (log) => (
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'actorId',
                  header: 'Actor',
                  render: (log) => {
                    const name = log.actorId?.name || 'System';
                    const email = log.actorId?.email || 'automated-task';
                    const initials = name.slice(0, 2).toUpperCase();

                    return (
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{email}</div>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (log) => (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getActionColor(
                        log.action
                      )}`}
                    >
                      <ScrollText className="w-3 h-3" />
                      {log.action}
                    </span>
                  ),
                },
                {
                  key: 'targetType',
                  header: 'Target Entity',
                  render: (log) => (
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {log.targetType}
                      </span>
                      {log.targetId && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{String(log.targetId).slice(-6)}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'metadata',
                  header: 'Metadata Details',
                  render: (log) => {
                    if (!log.metadata || Object.keys(log.metadata).length === 0) {
                      return <span className="text-xs text-slate-400">—</span>;
                    }
                    const keys = Object.keys(log.metadata).slice(0, 3);
                    return (
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {keys.map((k) => (
                          <span
                            key={k}
                            className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-mono"
                          >
                            <span className="font-semibold text-slate-700 mr-1">{k}:</span>
                            <span className="truncate max-w-[100px]">
                              {String(log.metadata?.[k])}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  },
                },
              ] satisfies Column<AuditEntry>[]}
              emptyMessage="No audit events found."
              emptyIcon={<ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />}
            />

            {/* Pagination Controls */}
            {pages > 1 && (
              <div className="flex items-center justify-between card p-3">
                <span className="text-xs text-slate-500">
                  Showing page <span className="font-bold text-slate-700">{page}</span> of{' '}
                  <span className="font-bold text-slate-700">{pages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default AuditLogPage;
