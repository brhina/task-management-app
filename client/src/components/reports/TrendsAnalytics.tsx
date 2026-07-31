import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

interface TrendsAnalyticsProps {
  trends: any;
  summary: any;
  cfd: any[];
  loading?: boolean;
}

const STATUS_COLORS = ['#94a3b8', '#3b82f6', '#a855f7', '#10b981'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs shadow-lg border border-slate-700">
        <p className="font-semibold text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 my-0.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-300 capitalize">{entry.name}:</span>
            <span className="font-bold text-white tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TrendsAnalytics: React.FC<TrendsAnalyticsProps> = ({
  trends,
  summary,
  cfd,
  loading = false,
}) => {
  const statusPie = summary
    ? [
        { name: 'Pending', value: summary.tasksByStatus?.pending || 0 },
        { name: 'In Progress', value: summary.tasksByStatus?.inProgress || 0 },
        { name: 'In Review', value: summary.tasksByStatus?.inReview || 0 },
        { name: 'Completed', value: summary.tasksByStatus?.completed || 0 },
      ]
    : [];

  const totalStatusTasks = statusPie.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6">
      {/* Upper grid: Completion Trends + Status Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Completion Trends (2 cols) */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Completion Trends (30 Days)
              </h3>
              <p className="text-xs text-slate-500">
                Created vs Completed tasks over time
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-slate-600">Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Completed</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading || !trends?.series ? (
              <div className="h-full w-full bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                Loading trend data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution (1 col) */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-primary" />
              Status Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Breakdown of tasks by workflow state
            </p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            {totalStatusTasks === 0 ? (
              <div className="text-xs text-slate-400">No status data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusPie.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={STATUS_COLORS[i % STATUS_COLORS.length]}
                        className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800 tabular-nums">
                {totalStatusTasks}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Tasks
              </span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100">
            {statusPie.map((status, i) => (
              <div key={status.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate">{status.name}</span>
                </div>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {status.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower full-width section: Cumulative Flow Diagram */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Cumulative Flow (30 Days)
            </h3>
            <p className="text-xs text-slate-500">
              Work-in-progress bottleneck identification across task lifecycle
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded bg-[#94a3b8]" /> Pending
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded bg-[#3b82f6]" /> In Progress
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded bg-[#a855f7]" /> In Review
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> Completed
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {!cfd || cfd.length === 0 ? (
            <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
              No cumulative flow data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cfd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Pending"
                  stackId="1"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="In Progress"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="In Review"
                  stackId="1"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Completed"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendsAnalytics;
