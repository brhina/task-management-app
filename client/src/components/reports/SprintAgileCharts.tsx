import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Flame, BarChart2, Calendar, Target } from 'lucide-react';

interface Sprint {
  sprintId: string;
  name: string;
  status: string;
  velocityHours?: number;
  plannedHours?: number;
  startDate?: string;
  endDate?: string;
}

interface SprintAgileChartsProps {
  sprints: Sprint[];
  selectedSprint: string;
  onSelectSprint: (sprintId: string) => void;
  burndown: any;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-700">
        <p className="font-semibold text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 my-0.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="font-bold text-slate-100 tabular-nums">{entry.value}h</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SprintAgileCharts: React.FC<SprintAgileChartsProps> = ({
  sprints,
  selectedSprint,
  onSelectSprint,
  burndown,
  loading = false,
}) => {
  const activeSprintObj = sprints.find((s) => s.sprintId === selectedSprint) || sprints[0];

  return (
    <div className="space-y-6">
      {/* Header bar with Sprint Selector & Overview */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Sprint Performance & Velocity
            </h3>
            <p className="text-xs text-slate-500">
              Track effort burndown and historical velocity across sprints
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sprint-select" className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Sprint:
            </label>
            <select
              id="sprint-select"
              value={selectedSprint}
              onChange={(e) => onSelectSprint(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">Select a sprint</option>
              {sprints.map((s) => (
                <option key={s.sprintId} value={s.sprintId}>
                  {s.name} {s.status ? `(${s.status})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeSprintObj && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Sprint Status</div>
              <div className="text-sm font-bold text-primary capitalize">
                {activeSprintObj.status || 'Active'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Velocity</div>
              <div className="text-sm font-bold text-slate-800 tabular-nums">
                {activeSprintObj.velocityHours || 0} hrs
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Planned Effort</div>
              <div className="text-sm font-bold text-slate-800 tabular-nums">
                {activeSprintObj.plannedHours || 0} hrs
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Efficiency Rate</div>
              <div className="text-sm font-bold text-emerald-600 tabular-nums">
                {activeSprintObj.plannedHours
                  ? `${Math.round(((activeSprintObj.velocityHours || 0) / activeSprintObj.plannedHours) * 100)}%`
                  : '100%'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Burndown & Velocity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sprint Burndown */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                Sprint Burndown Chart
              </h3>
              <p className="text-xs text-slate-500">
                Ideal trajectory vs remaining effort hours
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Remaining
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded bg-slate-400" /> Ideal
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {!burndown?.burndown?.length ? (
              <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                Select an active or completed sprint to view burndown
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndown.burndown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    dataKey="remaining"
                    name="Remaining"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ef4444' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    name="Ideal"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Velocity History */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Sprint Velocity History
              </h3>
              <p className="text-xs text-slate-500">
                Planned hours vs actual completed hours per sprint
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded bg-primary" /> Completed Velocity
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded bg-slate-400" /> Planned
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {sprints.length === 0 ? (
              <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                No sprint history found
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
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
                  <Bar
                    dataKey="velocityHours"
                    name="Completed"
                    fill="#339AF0"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="plannedHours"
                    name="Planned"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintAgileCharts;
