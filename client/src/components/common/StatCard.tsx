import React, { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatCardColorTheme =
  | 'slate'
  | 'emerald'
  | 'sky'
  | 'blue'
  | 'rose'
  | 'indigo'
  | 'amber'
  | 'violet'
  | 'purple'
  | 'cyan';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  subtext?: ReactNode;
  colorTheme?: StatCardColorTheme;
  progressBarValue?: number;
  progressBarColor?: string;
  borderLeftColor?: string;
  badge?: ReactNode;
  action?: ReactNode;
  valueClassName?: string;
  className?: string;
  onClick?: () => void;
}

const themeClasses: Record<
  StatCardColorTheme,
  { text: string; iconBg: string; iconText: string; title: string; bar: string }
> = {
  slate: {
    text: 'text-slate-800',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-500',
    title: 'text-slate-500',
    bar: 'bg-slate-500',
  },
  emerald: {
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600',
    title: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  sky: {
    text: 'text-sky-600',
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-600',
    title: 'text-sky-600',
    bar: 'bg-sky-500',
  },
  blue: {
    text: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-600',
    title: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  rose: {
    text: 'text-rose-600',
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-600',
    title: 'text-rose-600',
    bar: 'bg-rose-500',
  },
  indigo: {
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-500/10',
    iconText: 'text-indigo-600',
    title: 'text-indigo-600',
    bar: 'bg-indigo-500',
  },
  amber: {
    text: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600',
    title: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  violet: {
    text: 'text-violet-600',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600',
    title: 'text-violet-600',
    bar: 'bg-violet-500',
  },
  purple: {
    text: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-600',
    title: 'text-purple-600',
    bar: 'bg-purple-500',
  },
  cyan: {
    text: 'text-cyan-600',
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-600',
    title: 'text-cyan-600',
    bar: 'bg-cyan-500',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  colorTheme = 'slate',
  progressBarValue,
  progressBarColor,
  borderLeftColor,
  badge,
  action,
  valueClassName,
  className = '',
  onClick,
}) => {
  const theme = themeClasses[colorTheme] || themeClasses.slate;
  const borderLeft = borderLeftColor ? `border-l-4 ${borderLeftColor}` : '';

  return (
    <div
      onClick={onClick}
      className={`card p-2.5 sm:p-3 bg-white border border-slate-200/90 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between ${borderLeft} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-0.5 min-h-[20px]">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider truncate mr-1 ${theme.title}`}
          >
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge}
            {Icon && (
              <div className={`p-1 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        <div
          className={`text-xl font-extrabold tabular-nums tracking-tight ${
            valueClassName || theme.text
          }`}
        >
          {value}
        </div>
      </div>

      <div>
        {progressBarValue !== undefined && (
          <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`${progressBarColor || theme.bar} h-1 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(Math.max(progressBarValue, 0), 100)}%` }}
            />
          </div>
        )}

        {subtext && (
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate flex items-center gap-1">
            {subtext}
          </div>
        )}

        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
};

export default StatCard;
