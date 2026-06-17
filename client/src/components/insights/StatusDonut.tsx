import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';

type StatusKey = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'overdue';

export interface StatusDistributionInput {
    pending?: number;
    in_progress?: number;
    in_review?: number;
    completed?: number;
    overdue?: number;
}

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
    pending: { label: 'Pending', color: '#F59E0B' },
    in_progress: { label: 'In Progress', color: '#38BDF8' },
    in_review: { label: 'In Review', color: '#A78BFA' },
    completed: { label: 'Completed', color: '#10B981' },
    overdue: { label: 'Overdue', color: '#F43F5E' },
};

function toNumber(value: unknown): number {
    if (typeof value !== 'number') return 0;
    if (!Number.isFinite(value)) return 0;
    return value;
}

type TooltipPayloadItem = {
    name?: unknown;
    value?: unknown;
};

function TooltipContent({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
}) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const label = String(item?.name ?? '');
    const value = toNumber(item?.value);
    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur px-3 py-2 shadow-lg">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-sm font-semibold text-white tabular-nums">{value}%</div>
        </div>
    );
}

export default function StatusDonut({
    distribution,
    height = 220,
}: {
    distribution: StatusDistributionInput | null | undefined;
    height?: number;
}) {
    const pending = toNumber(distribution?.pending);
    const inProgress = toNumber(distribution?.in_progress);
    const inReview = toNumber(distribution?.in_review);
    const completed = toNumber(distribution?.completed);
    const overdue = toNumber(distribution?.overdue);

    const data = [
        { key: 'pending' as const, name: STATUS_META.pending.label, value: pending },
        { key: 'in_progress' as const, name: STATUS_META.in_progress.label, value: inProgress },
        { key: 'in_review' as const, name: STATUS_META.in_review.label, value: inReview },
        { key: 'completed' as const, name: STATUS_META.completed.label, value: completed },
        { key: 'overdue' as const, name: STATUS_META.overdue.label, value: overdue },
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
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={1}
                        isAnimationActive={false}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.key} fill={STATUS_META[entry.key].color} />
                        ))}
                    </Pie>
                    <Tooltip content={(props: any) => <TooltipContent {...props} />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

