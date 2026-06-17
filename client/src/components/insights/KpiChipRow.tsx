import type { ReactNode } from 'react';

export interface KpiChipItem {
  label: string;
  value: ReactNode;
}

export default function KpiChipRow({ items }: { items: KpiChipItem[] }) {
  const safe = items.filter((i) => i.value !== undefined && i.value !== null);
  if (safe.length === 0) return null;

  return (
    <div className="kpi-chip-row">
      {safe.map((item) => (
        <div key={item.label} className="kpi-chip">
          <span className="kpi-chip-label">{item.label}</span>
          <span className="kpi-chip-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
