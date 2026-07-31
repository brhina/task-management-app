import React from 'react';
import { Users, Grid, Trophy, CheckCircle, Clock } from 'lucide-react';

interface TeamMember {
  userId: string;
  name: string;
  completedThisWeek: number;
  completionRate: number;
  hoursLoggedThisWeek: number;
  workloadScore: number;
}

interface HeatmapCell {
  name: string;
  day: string;
  taskCount: number;
  effortHours: number;
}

interface TeamPerformanceSectionProps {
  teamPerf: TeamMember[];
  heatmap: HeatmapCell[];
  loading?: boolean;
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-indigo-500 text-white',
    'bg-emerald-500 text-white',
    'bg-sky-500 text-white',
    'bg-amber-500 text-white',
    'bg-purple-500 text-white',
    'bg-rose-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const TeamPerformanceSection: React.FC<TeamPerformanceSectionProps> = ({
  teamPerf,
  heatmap,
  loading = false,
}) => {
  const heatmapUsers = Array.from(new Set(heatmap.map((c) => c.name)));
  const heatmapDays = Array.from(new Set(heatmap.map((c) => c.day))).sort();

  return (
    <div className="space-y-6">
      {/* Team Performance Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Performance & Productivity
            </h3>
            <p className="text-xs text-slate-500">
              Individual task output, velocity, logged hours, and workload index
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-gray-100 px-3 py-1 rounded-full">
            {teamPerf.length} Active Members
          </div>
        </div>

        {teamPerf.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No performance data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3">Done / Wk</th>
                  <th className="py-3 px-3">Completion Rate</th>
                  <th className="py-3 px-3">Logged Hours</th>
                  <th className="py-3 px-3">Workload Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teamPerf.map((member) => {
                  const initials = member.name
                    ? member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?';

                  return (
                    <tr
                      key={member.userId}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarColor(
                              member.name
                            )}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {member.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 tabular-nums">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {member.completedThisWeek} tasks
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.completionRate >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : member.completionRate >= 50
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {member.completionRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 tabular-nums">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {member.hoursLoggedThisWeek} hrs
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                member.workloadScore > 85
                                  ? 'bg-rose-500'
                                  : member.workloadScore > 60
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(100, member.workloadScore)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                            {member.workloadScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workload Heatmap */}
      <div className="card p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Grid className="w-5 h-5 text-primary" />
              Workload Heatmap (Current Week)
            </h3>
            <p className="text-xs text-slate-500">
              Task density and daily activity per team member
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
            <span>Low</span>
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded bg-blue-100" />
              <span className="w-3 h-3 rounded bg-blue-300" />
              <span className="w-3 h-3 rounded bg-blue-500" />
              <span className="w-3 h-3 rounded bg-blue-600" />
            </div>
            <span>High</span>
          </div>
        </div>

        {heatmapUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No workload activity logged</div>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-semibold pr-4 py-2">
                  Team Member
                </th>
                {heatmapDays.map((day) => (
                  <th key={day} className="text-center text-slate-500 px-2 py-2 font-medium">
                    {day.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {heatmapUsers.map((name) => (
                <tr key={name}>
                  <td className="text-slate-800 font-semibold pr-4 py-2 whitespace-nowrap">
                    {name}
                  </td>
                  {heatmapDays.map((day) => {
                    const cell = heatmap.find((c) => c.name === name && c.day === day);
                    const taskCount = cell?.taskCount || 0;
                    const effortHours = cell?.effortHours || 0;
                    const intensity = Math.min(1, taskCount / 5);

                    return (
                      <td key={day} className="px-1.5 py-1.5 text-center">
                        <div
                          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center mx-auto transition-transform hover:scale-105 shadow-sm group relative"
                          style={{
                            backgroundColor:
                              taskCount === 0
                                ? 'rgba(241, 245, 249, 1)'
                                : `rgba(51, 154, 240, ${0.2 + intensity * 0.8})`,
                            color: intensity > 0.4 ? '#ffffff' : '#334155',
                          }}
                        >
                          <span className="font-bold text-xs tabular-nums">{taskCount}</span>
                          <span className="text-[9px] opacity-80">{effortHours}h</span>

                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 whitespace-nowrap bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 pointer-events-none">
                            <div className="font-bold">{name}</div>
                            <div>{day}: {taskCount} tasks ({effortHours}h)</div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeamPerformanceSection;
