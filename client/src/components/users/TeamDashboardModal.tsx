import Modal from '../common/Modal';
import { BarChart3, CheckCircle2, AlertCircle, Users, Activity } from 'lucide-react';
import RecentTaskActivityTree from './RecentTaskActivityTree';

interface TeamDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  dashboardData: any | null;
  error: string;
}

export default function TeamDashboardModal({
  isOpen,
  onClose,
  loading,
  dashboardData,
  error,
}: TeamDashboardModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        dashboardData?.team?.name
          ? `${dashboardData.team.name} Productivity Dashboard`
          : 'Team Dashboard'
      }
      subtitle="Real-time performance analytics, task status, priority breakdown, and recent activity"
      maxWidth="sm:max-w-3xl"
      footer={
        <button onClick={onClose} className="btn-primary text-xs">
          Done
        </button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="alert-error text-xs">{error}</div>
      ) : dashboardData ? (
        <div className="space-y-6">
          {/* Executive Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <div className="p-1 rounded-lg bg-slate-200/60 text-slate-700 w-fit mx-auto mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-extrabold text-slate-800 tabular-nums">
                {dashboardData.statistics?.totalTasks || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                Total Tasks
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100/80 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <div className="p-1 rounded-lg bg-rose-200/60 text-rose-700 w-fit mx-auto mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-extrabold text-rose-600 tabular-nums">
                {dashboardData.statistics?.overdueTasks || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-0.5">
                Overdue Tasks
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/80 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <div className="p-1 rounded-lg bg-emerald-200/60 text-emerald-700 w-fit mx-auto mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-extrabold text-emerald-600 tabular-nums">
                {dashboardData.statistics?.completedLast30Days || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5">
                Done (30 Days)
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-50 to-sky-100/80 border border-sky-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <div className="p-1 rounded-lg bg-sky-200/60 text-sky-700 w-fit mx-auto mb-1">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-extrabold text-sky-600 tabular-nums">
                {dashboardData.team?.memberCount || 0}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-500 mt-0.5">
                Team Members
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-white/90 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Task Status Distribution
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(dashboardData.statistics?.byStatus || {}).map(([status, count]) => (
                <div
                  key={status}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center"
                >
                  <span className="text-xs font-semibold text-slate-600">{status}</span>
                  <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                    {count as number}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <RecentTaskActivityTree
            tasks={dashboardData.recentTasks || []}
            title="Recent Team Activity"
            emptyMessage="No recent activity recorded for this team"
            showAssignee={true}
          />
        </div>
      ) : null}
    </Modal>
  );
}
