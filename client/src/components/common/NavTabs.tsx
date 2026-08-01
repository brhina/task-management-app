import type { ComponentType } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: number | string;
  disabled?: boolean;
}

interface NavTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function NavTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: NavTabsProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto rounded-2xl shadow-inner scrollbar-none ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`flex items-center gap-2 rounded-xl font-bold transition-all duration-200 whitespace-nowrap group ${
              isSm ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs'
            } ${
              isActive
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {Icon && (
              <Icon
                className={`shrink-0 transition-colors ${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full tabular-nums transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
