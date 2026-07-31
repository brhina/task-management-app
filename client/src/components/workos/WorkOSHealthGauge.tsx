import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, AlertTriangle, AlertCircle, Clock, Zap, Target, Activity } from 'lucide-react';

interface WorkOSHealthGaugeProps {
  health?: {
    score: number;
    status: 'on_track' | 'at_risk' | 'delayed' | 'critical';
    executionScore: number;
    velocityScore: number;
    riskScore: number;
    alignmentScore: number;
  };
}

export default function WorkOSHealthGauge({ health }: WorkOSHealthGaugeProps) {
  const score = health?.score ?? 85;
  const status = health?.status ?? 'on_track';

  const chartData = useMemo(() => [
    { name: 'Health', value: score },
    { name: 'Remaining', value: Math.max(0, 100 - score) },
  ], [score]);

  const { color, strokeColor, label, bg, icon: Icon } = useMemo(() => {
    switch (status) {
      case 'on_track':
        return {
          color: '#10B981',
          strokeColor: 'text-emerald-500',
          label: 'On Track',
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
          icon: ShieldCheck,
        };
      case 'at_risk':
        return {
          color: '#F59E0B',
          strokeColor: 'text-amber-500',
          label: 'At Risk',
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
          icon: AlertTriangle,
        };
      case 'delayed':
        return {
          color: '#F97316',
          strokeColor: 'text-orange-500',
          label: 'Delayed',
          bg: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
          icon: Clock,
        };
      case 'critical':
      default:
        return {
          color: '#EF4444',
          strokeColor: 'text-rose-500',
          label: 'Critical',
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
          icon: AlertCircle,
        };
    }
  }, [status]);

  return (
    <div className="card bg-gradient-to-r from-primary/10 via-white to-sky-50/50 border border-primary/20 text-slate-800 p-5 shadow-card relative overflow-hidden">
      {/* Background glow overlay */}
      <div
        className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left: Score Gauge */}
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={44}
                  startAngle={225}
                  endAngle={-45}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell key="health" fill={color} />
                  <Cell key="remaining" fill="#E2E8F0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black tracking-tight text-slate-800">{score}%</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Health</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${bg}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mt-1.5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              WorkOS Health Score
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
              Real-time aggregate index across execution throughput, capacity safety, velocity, and goal alignment.
            </p>
          </div>
        </div>

        {/* Right: Detailed Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Execution</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-800">{health?.executionScore ?? 80}%</span>
              <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${health?.executionScore ?? 80}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Velocity</span>
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-800">{health?.velocityScore ?? 88}%</span>
              <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health?.velocityScore ?? 88}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Safety</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-800">{health?.riskScore ?? 92}%</span>
              <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${health?.riskScore ?? 92}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Alignment</span>
              <Target className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-800">{health?.alignmentScore ?? 75}%</span>
              <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${health?.alignmentScore ?? 75}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
