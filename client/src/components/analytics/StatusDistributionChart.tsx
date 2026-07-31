import React from 'react';
import { Activity } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10b981',
  'In Progress': '#3b82f6',
  Pending: '#f59e0b',
  'In Review': '#8b5cf6',
  Cancelled: '#64748b',
};

interface StatusDistributionChartProps {
  byStatus: Record<string, number>;
  title?: string;
}

export default function StatusDistributionChart({
  byStatus,
  title = 'Status Distribution',
}: StatusDistributionChartProps) {
  const pieData = Object.entries(byStatus || {}).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#94a3b8',
  }));

  return (
    <div className="card">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        {title}
      </div>

      {pieData.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 italic">
          No status data recorded
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
