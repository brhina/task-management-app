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

interface PriorityData {
    high?: number;
    medium?: number;
    low?: number;
}

const PRIORITY_META = [
    { key: 'high', label: 'High', color: '#F43F5E', gradient: 'url(#gradHigh)' },
    { key: 'medium', label: 'Medium', color: '#F59E0B', gradient: 'url(#gradMedium)' },
    { key: 'low', label: 'Low', color: '#10B981', gradient: 'url(#gradLow)' },
];

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
            <div className="text-xs text-slate-400 mb-1">{name} priority</div>
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

export default function PriorityChart({
    distribution,
    height = 240,
}: {
    distribution: PriorityData | null | undefined;
    height?: number;
}) {
    const high = toNumber(distribution?.high);
    const medium = toNumber(distribution?.medium);
    const low = toNumber(distribution?.low);
    const total = high + medium + low;

    const data = PRIORITY_META
        .map((p) => ({
            ...p,
            value: toNumber(distribution?.[p.key as keyof PriorityData]),
            total,
        }))
        .filter((d) => d.value > 0);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
                No priority data
            </div>
        );
    }

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                    <defs>
                        <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB7185" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#BE123C" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#D97706" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
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
                                fill={`url(#grad${entry.key.charAt(0).toUpperCase() + entry.key.slice(1)})`}
                            />
                        ))}
                        <LabelList content={<BarLabel />} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
