import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    LabelList,
} from 'recharts';

type StatusKey = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'overdue';

export interface StatusDistributionInput {
    pending?: number;
    in_progress?: number;
    in_review?: number;
    completed?: number;
    overdue?: number;
    all?: number;
}

const STATUS_META: Record<StatusKey, { label: string; color: string; gradient: string }> = {
    pending: { label: 'Pending', color: '#F59E0B', gradient: 'url(#gradPending)' },
    in_progress: { label: 'In Progress', color: '#38BDF8', gradient: 'url(#gradInProgress)' },
    in_review: { label: 'In Review', color: '#A78BFA', gradient: 'url(#gradInReview)' },
    completed: { label: 'Completed', color: '#10B981', gradient: 'url(#gradCompleted)' },
    overdue: { label: 'Overdue', color: '#F43F5E', gradient: 'url(#gradOverdue)' },
};

function toNumber(value: unknown): number {
    if (typeof value !== 'number') return 0;
    if (!Number.isFinite(value)) return 0;
    return value;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const name = String(item?.name ?? '');
    const value = toNumber(item?.value);
    const total = toNumber(item?.payload?.total);
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 shadow-xl">
            <div className="text-xs text-slate-400 mb-1">{name}</div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white tabular-nums">{value}</span>
                <span className="text-xs text-slate-500">tasks</span>
                <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
            </div>
        </div>
    );
}

function BarLabel(props: any) {
    const { x, y, width, value } = props;
    if (!value || value === 0) return null;
    return (
        <text
            x={x + width / 2}
            y={y - 8}
            fill="#94a3b8"
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
            fontFamily="Inter, system-ui, sans-serif"
        >
            {value}
        </text>
    );
}

export default function StatusChart({
    distribution,
    height = 240,
}: {
    distribution: StatusDistributionInput | null | undefined;
    height?: number;
}) {
    const pending = toNumber(distribution?.pending);
    const inProgress = toNumber(distribution?.in_progress);
    const inReview = toNumber(distribution?.in_review);
    const completed = toNumber(distribution?.completed);
    const overdue = toNumber(distribution?.overdue);
    const total = toNumber(distribution?.all) || (pending + inProgress + inReview + completed + overdue);

    const data = [
        { key: 'pending' as const, name: STATUS_META.pending.label, value: pending, color: STATUS_META.pending.color, total },
        { key: 'in_progress' as const, name: STATUS_META.in_progress.label, value: inProgress, color: STATUS_META.in_progress.color, total },
        { key: 'in_review' as const, name: STATUS_META.in_review.label, value: inReview, color: STATUS_META.in_review.color, total },
        { key: 'completed' as const, name: STATUS_META.completed.label, value: completed, color: STATUS_META.completed.color, total },
        { key: 'overdue' as const, name: STATUS_META.overdue.label, value: overdue, color: STATUS_META.overdue.color, total },
    ].filter((d) => d.value > 0);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
                No distribution data
            </div>
        );
    }

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
                    <defs>
                        <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#D97706" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradInProgress" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#0284C7" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradInReview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C4B5FD" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FDA4AF" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#E11D48" stopOpacity={0.85} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                        dy={8}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {data.map((entry) => (
                            <Cell
                                key={entry.key}
                                fill={`url(#grad${entry.key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')})`}
                            />
                        ))}
                        <LabelList content={<BarLabel />} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
