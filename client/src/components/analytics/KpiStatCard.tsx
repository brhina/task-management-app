import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtext?: string;
  colorTheme?: 'slate' | 'emerald' | 'sky' | 'rose' | 'indigo' | 'amber';
  progressBarValue?: number;
}

export default function KpiStatCard({
  title,
  value,
  icon: Icon,
  subtext,
  colorTheme = 'slate',
  progressBarValue,
}: KpiStatCardProps) {
  const themeClasses = {
    slate: {
      text: 'text-slate-800',
      icon: 'text-slate-400',
      title: 'text-slate-500',
      bar: 'bg-slate-500',
    },
    emerald: {
      text: 'text-emerald-600',
      icon: 'text-emerald-500',
      title: 'text-emerald-600',
      bar: 'bg-emerald-500',
    },
    sky: {
      text: 'text-sky-600',
      icon: 'text-sky-500',
      title: 'text-sky-600',
      bar: 'bg-sky-500',
    },
    rose: {
      text: 'text-rose-600',
      icon: 'text-rose-500',
      title: 'text-rose-600',
      bar: 'bg-rose-500',
    },
    indigo: {
      text: 'text-indigo-600',
      icon: 'text-indigo-500',
      title: 'text-indigo-600',
      bar: 'bg-indigo-500',
    },
    amber: {
      text: 'text-amber-600',
      icon: 'text-amber-500',
      title: 'text-amber-600',
      bar: 'bg-amber-500',
    },
  };

  const theme = themeClasses[colorTheme];

  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] uppercase font-semibold tracking-wide ${theme.title}`}>
          {title}
        </span>
        <Icon className={`w-4 h-4 ${theme.icon}`} />
      </div>
      <div className={`text-2xl font-bold ${theme.text} tabular-nums`}>{value}</div>

      {progressBarValue !== undefined && (
        <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5 overflow-hidden">
          <div
            className={`${theme.bar} h-1 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(Math.max(progressBarValue, 0), 100)}%` }}
          ></div>
        </div>
      )}

      {subtext && <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{subtext}</div>}
    </div>
  );
}
