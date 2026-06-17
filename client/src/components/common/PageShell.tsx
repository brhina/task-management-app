import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  topSlot?: ReactNode;
  children?: ReactNode;
}

function PageShell({ title, subtitle, actions, topSlot, children }: PageShellProps) {
  return (
    <div className="space-y-4">
      {topSlot}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight min-w-0 flex-1">
            {title}
          </h1>
          {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
        </div>
        {subtitle && <div className="text-slate-400 text-sm">{subtitle}</div>}
      </div>
      <div className="page-section">{children}</div>
    </div>
  );
}

export default PageShell;
