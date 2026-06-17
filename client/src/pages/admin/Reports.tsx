import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { apiPaths } from '../../utils/apiPaths';
import axios from '../../utils/axios';
import PageShell from '../../components/common/PageShell';

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

const Reports = () => {
  const { user, getEffectiveRole } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const effectiveRole = getEffectiveRole();

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await axios.get(apiPaths.REPORTS.SUMMARY);
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (!user || effectiveRole !== 'OrgAdmin') {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to access this page." />
    );
  }

  const downloadReport = async (reportType: string) => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      let url: string;
      let filename: string;

      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const queryString = params.toString();
      const suffix = queryString ? `?${queryString}` : '';

      switch (reportType) {
        case 'tasks':
          url = `${apiPaths.REPORTS.Export_TASKS_REPORT}${suffix}`;
          filename = 'tasks_report.xlsx';
          break;
        case 'users':
          url = `${apiPaths.REPORTS.Export_USERS_REPORT}${suffix}`;
          filename = 'users_report.xlsx';
          break;
        case 'projects':
          url = `${apiPaths.REPORTS.Export_PROJECTS_REPORT}${suffix}`;
          filename = 'projects_report.xlsx';
          break;
        case 'goals':
          url = `${apiPaths.REPORTS.Export_GOALS_REPORT}${suffix}`;
          filename = 'goals_report.xlsx';
          break;
        default:
          return;
      }

      const response = await axios.get(url, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url_blob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_blob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);

      setMessage(
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded successfully!`
      );
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError(err.response?.data?.message || 'Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'tasks',
      title: 'Tasks Report',
      description: 'Export all tasks with status, priority, assignments, and progress tracking.',
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
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
      title: 'Users Report',
      description:
        'Export user performance with task counts, completion rates, and workload distribution.',
      color: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      ),
      stats: summary
        ? [
            { label: 'Members', value: summary.totalMembers },
            {
              label: 'Avg Tasks',
              value:
                summary.totalMembers > 0
                  ? Math.round(summary.totalTasks / summary.totalMembers)
                  : 0,
            },
            { label: 'Completion', value: `${summary.completionRate}%` },
          ]
        : [],
    },
    {
      id: 'projects',
      title: 'Projects Report',
      description:
        'Export project overview with task distribution, progress, and completion metrics.',
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
      stats: summary
        ? [
            { label: 'Projects', value: summary.totalProjects },
            { label: 'Tasks', value: summary.totalTasks },
            { label: 'Goals', value: summary.totalGoals },
          ]
        : [],
    },
    {
      id: 'goals',
      title: 'Goals Report',
      description: 'Export strategic goals with linked projects, status, and priority breakdown.',
      color: 'from-amber-500/20 to-amber-600/10',
      borderColor: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ),
      stats: summary
        ? [
            { label: 'Goals', value: summary.totalGoals },
            { label: 'Projects', value: summary.totalProjects },
            { label: 'Members', value: summary.totalMembers },
          ]
        : [],
    },
  ];

  return (
    <PageShell
      title="Reports"
      subtitle="Generate and download comprehensive reports for your organization."
    >
      <div className="space-y-6">
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-400">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">
                Total Tasks
              </div>
              <div className="text-2xl font-bold text-white">{summary.totalTasks}</div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.completionRate}% completion rate
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
              <div className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-1">
                Projects
              </div>
              <div className="text-2xl font-bold text-white">{summary.totalProjects}</div>
              <div className="text-xs text-slate-400 mt-1">{summary.totalGoals} goals linked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
              <div className="text-xs font-medium text-purple-400 uppercase tracking-wide mb-1">
                Team Members
              </div>
              <div className="text-2xl font-bold text-white">{summary.totalMembers}</div>
              <div className="text-xs text-slate-400 mt-1">Active contributors</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">
                Overdue Tasks
              </div>
              <div className="text-2xl font-bold text-white">{summary.overdueTasks}</div>
              <div className="text-xs text-slate-400 mt-1">Need attention</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-300">Filter Reports</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          {(dateRange.startDate || dateRange.endDate || statusFilter || priorityFilter) && (
            <button
              onClick={() => {
                setDateRange({ startDate: '', endDate: '' });
                setStatusFilter('');
                setPriorityFilter('');
              }}
              className="mt-3 text-xs text-primary hover:text-primary-hover font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Report Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className={`bg-gradient-to-br ${report.color} border ${report.borderColor} rounded-xl p-5 hover:scale-[1.01] transition-transform`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${report.iconColor}`}>{report.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-4">{report.description}</p>

              {report.stats.length > 0 && (
                <div className="flex gap-4 mb-4">
                  {report.stats.map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-lg font-bold text-white">{stat.value}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => downloadReport(report.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Excel
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-slate-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">About Reports</p>
              <p>• Reports are exported in Excel format (.xlsx) for easy analysis and sharing.</p>
              <p>
                • Use the filters above to generate reports for specific date ranges, statuses, or
                priorities.
              </p>
              <p>• Data is pulled in real-time from your organization's database.</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Reports;
