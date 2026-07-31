import React from 'react';
import { Download, Filter, FileSpreadsheet, Users, Folder, Target, CheckCircle2 } from 'lucide-react';

interface ReportSummary {
  totalTasks: number;
  totalProjects: number;
  totalGoals: number;
  totalMembers: number;
  tasksByStatus: {
    pending: number;
    inProgress: number;
    inReview: number;
    completed: number;
  };
  overdueTasks: number;
  completionRate: number;
}

interface ExcelExportsSectionProps {
  dateRange: { startDate: string; endDate: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string }>>;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  summary: ReportSummary | null;
  canExport: boolean;
  exportLoading: boolean;
  onDownloadReport: (reportType: string) => void;
}

export const ExcelExportsSection: React.FC<ExcelExportsSectionProps> = ({
  dateRange,
  setDateRange,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  summary,
  canExport,
  exportLoading,
  onDownloadReport,
}) => {
  const reportCards = [
    {
      id: 'tasks',
      title: 'Tasks Report (.xlsx)',
      description: 'Export all tasks with status, priority, assignments, estimate, and completion data.',
      icon: FileSpreadsheet,
      accent: 'emerald',
      bgIcon: 'bg-emerald-50 text-emerald-700',
      stats: summary
        ? [
            { label: 'Total', value: summary.totalTasks },
            { label: 'Completed', value: summary.tasksByStatus.completed },
            { label: 'Overdue', value: summary.overdueTasks },
          ]
        : [],
    },
    {
      id: 'users',
      title: 'Users & Performance (.xlsx)',
      description: 'Export team member workloads, task completion rates, and logged effort hours.',
      icon: Users,
      accent: 'sky',
      bgIcon: 'bg-blue-50 text-blue-700',
      stats: summary
        ? [
            { label: 'Members', value: summary.totalMembers },
            { label: 'Completion', value: `${summary.completionRate}%` },
          ]
        : [],
    },
    {
      id: 'projects',
      title: 'Projects & Progress (.xlsx)',
      description: 'Export project milestones, task distributions, health status, and owner info.',
      icon: Folder,
      accent: 'indigo',
      bgIcon: 'bg-purple-50 text-purple-700',
      stats: summary ? [{ label: 'Projects', value: summary.totalProjects }] : [],
    },
    {
      id: 'goals',
      title: 'Strategic Goals (.xlsx)',
      description: 'Export key organizational targets, linked project progress, and completion states.',
      icon: Target,
      accent: 'purple',
      bgIcon: 'bg-amber-50 text-amber-700',
      stats: summary ? [{ label: 'Goals', value: summary.totalGoals }] : [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Control Box */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Export Filters & Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Narrow down export data by date boundaries, task status, or priority level
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Priority Filter
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Action Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {reportCards.map((report) => {
          const IconComp = report.icon;

          return (
            <div
              key={report.id}
              className="card p-5 flex flex-col justify-between hover:border-primary/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${report.bgIcon}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">
                      {report.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for Excel export
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {report.description}
                </p>

                {report.stats.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 mb-4">
                    {report.stats.map((stat, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-sm font-bold text-slate-800 tabular-nums">
                          {stat.value}
                        </div>
                        <div className="text-[9px] uppercase font-semibold text-slate-400">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onDownloadReport(report.id)}
                disabled={!canExport || exportLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg text-xs shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Generating Excel...' : 'Download Excel Spreadsheet'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExcelExportsSection;
