import { useEffect, useState } from 'react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface AllocationRow {
  userId: string;
  user?: { name: string; email: string };
  capacityHoursPerWeek: number;
  capacityInWindow: number;
  assignedHours: number;
  loggedHours: number;
  openTaskCount: number;
  overloaded: boolean;
  utilizationPercent: number;
}

export default function Resources() {
  const [allocation, setAllocation] = useState<AllocationRow[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [from, setFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const [aRes, cRes] = await Promise.all([
      api.get(apiPaths.RESOURCES.ALLOCATION, { params: { from, to } }),
      api.get(apiPaths.RESOURCES.CONFLICTS, { params: { from, to } }),
    ]);
    setAllocation(aRes.data.data?.allocation || []);
    setConflicts(cRes.data.data || []);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <PageShell
      title="Resources"
      subtitle="Capacity, workload, and conflict detection"
      actions={
        <button
          type="button"
          onClick={() => load()}
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
        >
          Refresh
        </button>
      }
    >
      <div className="card flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">From</label>
          <input
            type="date"
            className="input-field text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">To</label>
          <input
            type="date"
            className="input-field text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary" onClick={() => load()}>
          Apply
        </button>
      </div>

      {conflicts.length > 0 && (
        <div className="alert-error mb-4">
          {conflicts.length} member(s) over capacity in this window.
        </div>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-gray-200">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Capacity/wk</th>
              <th className="py-2 pr-3">Window capacity</th>
              <th className="py-2 pr-3">Assigned</th>
              <th className="py-2 pr-3">Logged</th>
              <th className="py-2 pr-3">Open tasks</th>
              <th className="py-2 pr-3">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((row) => (
              <tr
                key={String(row.userId)}
                className={`border-b border-gray-200 ${
                  row.overloaded ? 'bg-rose-500/5' : ''
                }`}
              >
                <td className="py-2 pr-3 text-slate-700">
                  {row.user?.name || 'User'}
                  {row.overloaded && (
                    <span className="ml-2 text-[10px] text-rose-400 font-semibold">
                      OVERLOAD
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-slate-500">
                  {row.capacityHoursPerWeek}h
                </td>
                <td className="py-2 pr-3 text-slate-500">
                  {row.capacityInWindow.toFixed(1)}h
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {row.assignedHours.toFixed(1)}h
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {row.loggedHours.toFixed(1)}h
                </td>
                <td className="py-2 pr-3 text-slate-500">{row.openTaskCount}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded bg-white max-w-[80px] overflow-hidden">
                      <div
                        className={`h-full ${
                          row.overloaded ? 'bg-rose-500' : 'bg-cyan-500'
                        }`}
                        style={{
                          width: `${Math.min(100, row.utilizationPercent)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {row.utilizationPercent}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
