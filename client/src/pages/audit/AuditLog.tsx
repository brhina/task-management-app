import { useContext, useEffect, useState } from 'react';
import { Download, Filter, ScrollText } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import PageShell from '../../components/common/PageShell';
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

const AuditLogPage = () => {
  const { hasPermission } = useContext(UserContext);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const canView = hasPermission('org:audit');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '40');
      if (filters.action) params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      const res = await axios.get(`${apiPaths.AUDIT.LIST}?${params.toString()}`);
      setLogs(res.data.data || []);
      setPages(res.data.pagination?.pages || 1);
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

  if (!canView) {
    return <PageShell title="Access Denied" subtitle="You need org:audit permission." />;
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
      link.download = `audit-log.${format === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    }
  };

  return (
    <PageShell
      title="Audit Log"
      subtitle="Track significant organization actions with filters and export."
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filters</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filters.action}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, action: e.target.value });
              }}
              className="bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, startDate: e.target.value });
              }}
              className="bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, endDate: e.target.value });
              }}
              className="bg-gray-100 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800"
            />
            <div className="flex gap-2">
              <button
                onClick={() => exportLogs('xlsx')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 border border-slate-600 rounded-lg text-xs text-slate-800"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => exportLogs('csv')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 border border-slate-600 rounded-lg text-xs text-slate-800"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading audit log...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200/50">
            <table className="w-full text-sm">
              <thead className="bg-white/80 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-t border-gray-200/40 text-slate-600">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-800 text-xs">{log.actorId?.name || 'System'}</div>
                      <div className="text-[10px] text-slate-500">{log.actorId?.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                        <ScrollText className="w-3 h-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.targetType}
                      {log.targetId ? ` · ${String(log.targetId).slice(-6)}` : ''}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No audit events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default AuditLogPage;
