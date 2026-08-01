import { useState, useEffect, useContext } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  FileSpreadsheet,
  Layers,
  Info,
} from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { apiPaths } from '../../utils/apiPaths';
import axios from '../../utils/axios';
import PageShell from '../../components/common/PageShell';
import NavTabs from '../../components/common/NavTabs';

import ReportsHeaderKpis from '../../components/reports/ReportsHeaderKpis';
import TrendsAnalytics from '../../components/reports/TrendsAnalytics';
import SprintAgileCharts from '../../components/reports/SprintAgileCharts';
import TeamPerformanceSection from '../../components/reports/TeamPerformanceSection';
import ProjectHealthAndDeps from '../../components/reports/ProjectHealthAndDeps';
import ExcelExportsSection from '../../components/reports/ExcelExportsSection';

type TabType = 'all' | 'trends' | 'sprints' | 'team' | 'exports';

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
  const { user, hasPermission } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Data states
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [teamPerf, setTeamPerf] = useState<any[]>([]);
  const [velocity, setVelocity] = useState<any>(null);
  const [cfd, setCfd] = useState<any[]>([]);
  const [projectHealth, setProjectHealth] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [burndown, setBurndown] = useState<any>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [timeReport, setTimeReport] = useState<any>(null);
  const [deps, setDeps] = useState<any>(null);

  // Export filters
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const canView = hasPermission('report:view');
  const canExport = hasPermission('report:export');

  useEffect(() => {
    if (!canView) return;
    fetchAll();
  }, [canView]);

  const fetchAll = async () => {
    try {
      setSummaryLoading(true);
      const [
        summaryRes,
        trendsRes,
        teamRes,
        velocityRes,
        cfdRes,
        healthRes,
        heatRes,
        timeRes,
        depsRes,
      ] = await Promise.all([
        axios.get(apiPaths.REPORTS.SUMMARY),
        axios.get(`${apiPaths.REPORTS.TRENDS}?days=30`),
        axios.get(apiPaths.REPORTS.TEAM_PERFORMANCE),
        axios.get(apiPaths.REPORTS.SPRINT_VELOCITY),
        axios.get(`${apiPaths.REPORTS.CUMULATIVE_FLOW}?days=30`),
        axios.get(apiPaths.REPORTS.PROJECT_HEALTH),
        axios.get(apiPaths.REPORTS.WORKLOAD_HEATMAP),
        axios.get(apiPaths.TIME_ENTRIES.REPORT).catch(() => null),
        axios.get(apiPaths.DEPENDENCIES.ANALYSIS).catch(() => null),
      ]);

      setSummary(summaryRes.data);
      setTrends(trendsRes.data?.data);
      setTeamPerf(teamRes.data?.data || []);
      setVelocity(velocityRes.data?.data);
      setSprints(velocityRes.data?.data?.sprints || []);
      setCfd(cfdRes.data?.data?.series || []);
      setProjectHealth(healthRes.data?.data || []);
      setHeatmap(heatRes.data?.data || []);
      setTimeReport(timeRes?.data?.data || null);
      setDeps(depsRes?.data?.data || null);

      const activeSprint = (velocityRes.data?.data?.sprints || []).find(
        (s: any) => s.status === 'Active'
      );
      if (activeSprint) {
        setSelectedSprint(activeSprint.sprintId);
        await loadBurndown(activeSprint.sprintId);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load reports data. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadBurndown = async (sprintId: string) => {
    try {
      const res = await axios.get(`${apiPaths.REPORTS.BURNDOWN}?sprintId=${sprintId}`);
      setBurndown(res.data?.data);
    } catch {
      setBurndown(null);
    }
  };

  const downloadReport = async (reportType: string) => {
    if (!canExport) {
      setError('You do not have permission to export reports.');
      return;
    }
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

      const response = await axios.get(url, { responseType: 'blob' });
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

  if (!user || !canView) {
    return (
      <PageShell title="Access Denied" subtitle="You don't have permission to view reports." />
    );
  }

  const navTabs = [
    { id: 'all' as TabType, label: 'All Insights', icon: Layers },
    { id: 'trends' as TabType, label: 'Trends & Flow', icon: TrendingUp },
    { id: 'sprints' as TabType, label: 'Sprint & Agile', icon: Target },
    { id: 'team' as TabType, label: 'Team & Workload', icon: Users },
    { id: 'exports' as TabType, label: 'Excel Exports', icon: FileSpreadsheet },
  ];

  return (
    <PageShell
      title="Reports & Analytics"
      subtitle="Interactive trends, sprint velocity charts, workload heatmaps, and Excel export reports."
    >
      <div className="space-y-6">
        {/* Status Alerts */}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center justify-between shadow-sm">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-xs font-semibold hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-xs font-semibold hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header KPI Strip */}
        <ReportsHeaderKpis
          summary={summary}
          trends={trends}
          velocity={velocity}
          timeReport={timeReport}
          deps={deps}
          loading={summaryLoading}
        />

        {/* Navigation Tabs Bar */}
        <NavTabs<TabType>
          tabs={navTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab Content Rendering */}
        {(activeTab === 'all' || activeTab === 'trends') && (
          <TrendsAnalytics
            trends={trends}
            summary={summary}
            cfd={cfd}
            loading={summaryLoading}
          />
        )}

        {(activeTab === 'all' || activeTab === 'sprints') && (
          <SprintAgileCharts
            sprints={sprints}
            selectedSprint={selectedSprint}
            onSelectSprint={(id) => {
              setSelectedSprint(id);
              if (id) loadBurndown(id);
            }}
            burndown={burndown}
            loading={summaryLoading}
          />
        )}

        {(activeTab === 'all' || activeTab === 'team') && (
          <>
            <TeamPerformanceSection
              teamPerf={teamPerf}
              heatmap={heatmap}
              loading={summaryLoading}
            />
            <ProjectHealthAndDeps
              projectHealth={projectHealth}
              deps={deps}
              timeReport={timeReport}
              loading={summaryLoading}
            />
          </>
        )}

        {activeTab === 'exports' && (
          <ExcelExportsSection
            dateRange={dateRange}
            setDateRange={setDateRange}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            summary={summary}
            canExport={canExport}
            exportLoading={loading}
            onDownloadReport={downloadReport}
          />
        )}

        {/* Analytics Information Footer */}
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">
                Analytics Computation Methodology
              </p>
              <p>
                • <strong>Completion velocity & time-to-clear:</strong> Derived from actual closed task resolution trends over trailing 7 to 30 days.
              </p>
              <p>
                • <strong>Sprint burndown & velocity:</strong> Measures remaining effort hours vs. ideal velocity curve based on sprint log transitions.
              </p>
              <p>
                • <strong>Project health score:</strong> Algorithmically weights deadline risks, open issue density, and overdue completion ratios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Reports;
