import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Users, AlertTriangle, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';

interface MemberWorkload {
  userId: string;
  name: string;
  email: string;
  activeTaskCount: number;
  assignedHours: number;
  capacityHours: number;
  utilizationRate: number;
  status: 'Optimal' | 'Overloaded' | 'Available';
}

interface WorkloadHeatmapProps {
  members: MemberWorkload[];
  overallUtilization: number;
  overloadedCount: number;
  onRebalanceClick?: () => void;
  canManage?: boolean;
}

export default function WorkloadHeatmap({
  members = [],
  overallUtilization,
  overloadedCount,
  onRebalanceClick,
  canManage = true,
}: WorkloadHeatmapProps) {
  const chartData = useMemo(() => {
    return members.map((m) => ({
      name: m.name.split(' ')[0] || m.name,
      assigned: m.assignedHours,
      capacity: m.capacityHours,
      rate: m.utilizationRate,
      status: m.status,
    }));
  }, [members]);

  return (
    <div className="space-y-4">
      {/* Top Utilization Summary Banner */}
      <div className="card bg-white border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-slate-800">Team Capacity & Workload Distribution</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monitors individual work commitments against weekly capacity limits to prevent burnout and bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Org Utilization</div>
              <div className="text-lg font-black text-slate-800">{overallUtilization}%</div>
            </div>

            {overloadedCount > 0 && canManage && onRebalanceClick && (
              <button
                type="button"
                onClick={onRebalanceClick}
                className="btn btn-primary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Smart Rebalance ({overloadedCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {members.length > 0 && (
        <div className="card bg-white border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Assigned Hours vs Weekly Capacity Limit
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value} hours`,
                    name === 'assigned' ? 'Assigned Effort' : 'Weekly Capacity',
                  ]}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="assigned" name="Assigned Effort (h)" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.status === 'Overloaded'
                          ? '#EF4444'
                          : entry.status === 'Available'
                            ? '#3B82F6'
                            : '#10B981'
                      }
                    />
                  ))}
                </Bar>
                <Bar dataKey="capacity" name="Weekly Capacity (h)" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Member Table */}
      <div className="card bg-white border border-gray-200 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Team Member Capacity Roster ({members.length})
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">Updated live based on active task commitments</span>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No active team members loaded.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.userId} className="p-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        {m.name}
                        {m.status === 'Overloaded' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overloaded ({m.utilizationRate}%)
                          </span>
                        )}
                        {m.status === 'Optimal' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Optimal ({m.utilizationRate}%)
                          </span>
                        )}
                        {m.status === 'Available' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Available ({m.utilizationRate}%)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:justify-end text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Active Tasks</span>
                      <span className="font-bold text-slate-800">{m.activeTaskCount} tasks</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Commitment</span>
                      <span className="font-bold text-slate-800">{m.assignedHours}h / {m.capacityHours}h</span>
                    </div>

                    <div className="w-24 shrink-0">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                        <span>Load</span>
                        <span>{m.utilizationRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            m.status === 'Overloaded'
                              ? 'bg-rose-500'
                              : m.status === 'Available'
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, m.utilizationRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
