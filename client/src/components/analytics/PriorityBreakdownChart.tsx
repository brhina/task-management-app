import React from 'react';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#ef4444',
  High: '#f97316',
  Medium: '#06b6d4',
  Low: '#64748b',
};

interface PriorityBreakdownChartProps {
  byPriority: Record<string, number>;
  title?: string;
}

export default function PriorityBreakdownChart({
  byPriority,
  title = 'Priority Breakdown',
}: PriorityBreakdownChartProps) {
  const barData = Object.entries(byPriority || {}).map(([name, value]) => ({
    name,
    Tasks: value,
    color: PRIORITY_COLORS[name] || '#64748b',
  }));

  return (
    <div className="card">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-500" />
        {title}
      </div>

      {barData.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 italic">
          No priority data recorded
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="Tasks" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
