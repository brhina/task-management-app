import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  Folder,
  ClipboardCheck,
  Target,
  Users,
  Shield,
  BarChart3,
  Settings,
  FileText,
  ScrollText,
  UsersRound,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const getBreadcrumbIcon = (label?: string | null, index?: number): LucideIcon | null => {
  if (index === 0 || label === 'Home') return Home;
  const lower = (label ?? '').toString().trim().toLowerCase();
  if (lower.includes('project')) return Folder;
  if (lower.includes('task')) return ClipboardCheck;
  if (lower.includes('goal')) return Target;
  if (lower.includes('user') || lower.includes('team')) return Users;
  if (lower.includes('role')) return Shield;
  if (lower.includes('report')) return BarChart3;
  if (lower.includes('workos') || lower.includes('setting')) return Settings;
  if (lower.includes('template')) return FileText;
  if (lower.includes('audit')) return ScrollText;
  if (lower.includes('resource')) return UsersRound;
  if (lower.includes('dashboard')) return LayoutDashboard;
  return null;
};

function Breadcrumbs() {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const buildBreadcrumbs = async () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', path: '/dashboard' },
      ];

      const path = location.pathname;

      // /projects
      if (path === '/projects') {
        items.push({ label: 'Projects', path: '/projects' });
        setBreadcrumbs(items);
        return;
      }

      // /projects/:id/*
      const projectMatch = path.match(/^\/projects\/([a-f0-9]{24})/i);
      if (projectMatch) {
        items.push({ label: 'Projects', path: '/projects' });
        try {
          const res = await api.get(`/api/projects/${projectMatch[1]}`);
          const project = res.data.data.project;
          const sub = path.replace(`/projects/${projectMatch[1]}`, '').replace(/^\//, '');
          const subLabels: Record<string, string> = { edit: 'Edit', sprints: 'Sprints', gantt: 'Gantt' };
          items.push({ label: project.name, path: `/tasks?projectId=${projectMatch[1]}` });
          if (sub && subLabels[sub]) {
            items.push({ label: subLabels[sub], path });
          }
        } catch {
          items.push({ label: 'Project', path });
        }
        setBreadcrumbs(items);
        return;
      }

      // /tasks (with optional projectId query param)
      if (path === '/tasks' || location.pathname === '/tasks') {
        const projectId = new URLSearchParams(location.search).get('projectId');
        if (projectId) {
          try {
            const res = await api.get(`/api/projects/${projectId}`);
            items.push({ label: res.data.data.project.name, path: `/tasks?projectId=${projectId}` });
            items.push({ label: 'Tasks', path });
          } catch {
            items.push({ label: 'Tasks', path });
          }
        } else {
          items.push({ label: 'Tasks', path: '/tasks' });
        }
        setBreadcrumbs(items);
        return;
      }

      // /tasks/create
      if (path === '/tasks/create') {
        items.push({ label: 'Tasks', path: '/tasks' });
        items.push({ label: 'Create', path });
        setBreadcrumbs(items);
        return;
      }

      // /tasks/templates
      if (path === '/tasks/templates') {
        items.push({ label: 'Tasks', path: '/tasks' });
        items.push({ label: 'Templates', path });
        setBreadcrumbs(items);
        return;
      }

      // /tasks/:id or /tasks/:id/edit
      const taskMatch = path.match(/^\/tasks\/([a-f0-9]{24})/i);
      if (taskMatch) {
        try {
          const res = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', taskMatch[1]));
          const task = res.data.data;

          // If subtask, add project > parent > current
          if (task.parentTaskId) {
            const parentId = task.parentTaskId._id || task.parentTaskId;
            const parentRes = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', parentId));
            const parentTask = parentRes.data.data;

            // Add project if parent has one
            if (parentTask.projectId) {
              const projId = parentTask.projectId._id || parentTask.projectId;
              try {
                const projRes = await api.get(`/api/projects/${projId}`);
                items.push({ label: projRes.data.data.project.name, path: `/tasks?projectId=${projId}` });
              } catch {}
            }

            items.push({ label: parentTask.title, path: `/tasks/${parentId}` });
            items.push({ label: task.title, path: `/tasks/${taskMatch[1]}` });
          } else {
            // Top-level task: project > task
            if (task.projectId) {
              const projId = task.projectId._id || task.projectId;
              try {
                const projRes = await api.get(`/api/projects/${projId}`);
                items.push({ label: projRes.data.data.project.name, path: `/tasks?projectId=${projId}` });
              } catch {}
            }
            items.push({ label: task.title, path: `/tasks/${taskMatch[1]}` });
          }

          if (path.endsWith('/edit')) {
            items.push({ label: 'Edit', path });
          }
        } catch {
          items.push({ label: 'Tasks', path: '/tasks' });
          items.push({ label: 'Task', path });
        }
        setBreadcrumbs(items);
        return;
      }

      // /goals
      if (path === '/goals') {
        items.push({ label: 'Goals', path: '/goals' });
        setBreadcrumbs(items);
        return;
      }

      // /goals/:id or /goals/:id/edit
      const goalMatch = path.match(/^\/goals\/([a-f0-9]{24})/i);
      if (goalMatch) {
        items.push({ label: 'Goals', path: '/goals' });
        try {
          const res = await api.get(`/api/goals/${goalMatch[1]}`);
          items.push({ label: res.data.data.title, path });
        } catch {
          items.push({ label: 'Goal', path });
        }
        setBreadcrumbs(items);
        return;
      }

      // /sprints/:id/board
      const sprintMatch = path.match(/^\/sprints\/([a-f0-9]{24})/i);
      if (sprintMatch) {
        items.push({ label: 'Tasks', path: '/tasks' });
        try {
          const res = await api.get(`/api/sprints/${sprintMatch[1]}`);
          items.push({ label: res.data.data.name, path });
        } catch {
          items.push({ label: 'Sprint', path });
        }
        setBreadcrumbs(items);
        return;
      }

      // Other pages
      const routeLabels: Record<string, string> = {
        dashboard: 'Dashboard', users: 'Users', profile: 'Profile',
        settings: 'Settings', workos: 'WorkOS', roles: 'Roles',
        notifications: 'Notifications',
        teams: 'Teams', reports: 'Reports', resources: 'Resources',
        audit: 'Audit Log',
      };
      const segments = path.split('/').filter(Boolean);
      let currentPath = '';
      for (const seg of segments) {
        currentPath += `/${seg}`;
        const label = routeLabels[seg.toLowerCase()] || seg.charAt(0).toUpperCase() + seg.slice(1);
        items.push({ label, path: currentPath });
      }

      setBreadcrumbs(items);
    };

    buildBreadcrumbs();
  }, [location.pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 overflow-x-auto py-0.5 no-scrollbar whitespace-nowrap">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const label = item.label?.trim() || 'Untitled';
        const IconComponent = getBreadcrumbIcon(label, index);

        return (
          <div key={`${item.path}-${index}`} className="flex items-center gap-1.5 shrink-0">
            {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            {isLast ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200/80 text-sm shadow-2xs">
                {IconComponent && <IconComponent className="w-4 h-4 text-primary shrink-0" />}
                <span className="truncate max-w-[200px] sm:max-w-[320px]">{label}</span>
              </span>
            ) : (
              <Link
                to={item.path}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-slate-600 hover:text-primary hover:bg-slate-100 transition-all text-sm font-medium"
              >
                {IconComponent && <IconComponent className="w-4 h-4 text-slate-400 hover:text-primary shrink-0" />}
                <span className="truncate max-w-[150px] sm:max-w-[240px]">{label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
