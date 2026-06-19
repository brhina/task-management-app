import { useState, useEffect, useContext } from 'react';
import { FileText, Users, Folder, Target, Filter, Download, Info } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { usePageAssistant } from '../../hooks/usePageAssistant';
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
  usePageAssistant({ pageType: 'reports', pageTitle: 'Reports' });
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
      icon: <FileText className="w-6 h-6" />,
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
      icon: <Users className="w-6 h-6" />,
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
      icon: <Folder className="w-6 h-6" />,
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
      icon: <Target className="w-6 h-6" />,
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

        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
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
              className="card hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-primary">{report.icon}</div>
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
                    <Download className="w-4 h-4" />
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
            <Info className="w-5 h-5 text-slate-400 mt-0.5" />
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
