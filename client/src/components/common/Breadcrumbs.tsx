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
  if (
    lower.includes('workos') ||
    lower.includes('setting') ||
    lower.includes('enterprise') ||
    lower.includes('notification')
  )
    return Settings;
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
    let isSubscribed = true;

    const buildBreadcrumbs = async () => {
      const items: BreadcrumbItem[] = [{ label: 'Home', path: '/dashboard' }];
      const path = location.pathname;

      // 1. Settings Routes - Direct, clean hierarchy without intermediate dummy links
      if (path.startsWith('/settings')) {
        if (path === '/settings/workos' || path === '/settings') {
          items.push({ label: 'WorkOS', path: '/settings/workos' });
        } else if (path === '/settings/roles') {
          items.push({ label: 'Roles & Permissions', path: '/settings/roles' });
        } else if (path === '/settings/notifications') {
          items.push({ label: 'Notifications', path: '/settings/notifications' });
        } else if (path === '/settings/enterprise') {
          items.push({ label: 'Enterprise Center', path: '/settings/enterprise' });
        } else {
          const seg = path.replace('/settings/', '');
          const formatted = seg.charAt(0).toUpperCase() + seg.slice(1);
          items.push({ label: formatted, path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 2. Projects Routes
      if (path === '/projects') {
        items.push({ label: 'Projects', path: '/projects' });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      const projectMatch = path.match(/^\/projects\/([a-f0-9]{24})/i);
      if (projectMatch) {
        items.push({ label: 'Projects', path: '/projects' });
        try {
          const res = await api.get(`/api/projects/${projectMatch[1]}`);
          const project = res.data?.data?.project || res.data?.data;
          const sub = path.replace(`/projects/${projectMatch[1]}`, '').replace(/^\//, '');
          const subLabels: Record<string, string> = { edit: 'Edit', sprints: 'Sprints', gantt: 'Gantt' };
          items.push({ label: project?.name || 'Project Details', path: `/tasks?projectId=${projectMatch[1]}` });
          if (sub && subLabels[sub]) {
            items.push({ label: subLabels[sub], path });
          }
        } catch {
          items.push({ label: 'Project', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 3. Tasks Routes
      if (path === '/tasks') {
        const projectId = new URLSearchParams(location.search).get('projectId');
        if (projectId) {
          try {
            const res = await api.get(`/api/projects/${projectId}`);
            const project = res.data?.data?.project || res.data?.data;
            items.push({ label: 'Projects', path: '/projects' });
            items.push({ label: project?.name || 'Project', path: `/tasks?projectId=${projectId}` });
            items.push({ label: 'Tasks', path: `/tasks?projectId=${projectId}` });
          } catch {
            items.push({ label: 'Tasks', path: '/tasks' });
          }
        } else {
          items.push({ label: 'Tasks', path: '/tasks' });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/tasks/create') {
        items.push({ label: 'Tasks', path: '/tasks' });
        items.push({ label: 'Create Task', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/tasks/templates') {
        items.push({ label: 'Tasks', path: '/tasks' });
        items.push({ label: 'Task Templates', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      const taskMatch = path.match(/^\/tasks\/([a-f0-9]{24})/i);
      if (taskMatch) {
        try {
          const res = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', taskMatch[1]));
          const task = res.data?.data;

          if (task?.parentTaskId) {
            const parentId = task.parentTaskId._id || task.parentTaskId;
            const parentRes = await api.get(apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', parentId));
            const parentTask = parentRes.data?.data;

            if (parentTask?.projectId) {
              const projId = parentTask.projectId._id || parentTask.projectId;
              try {
                const projRes = await api.get(`/api/projects/${projId}`);
                const proj = projRes.data?.data?.project || projRes.data?.data;
                items.push({ label: 'Projects', path: '/projects' });
                items.push({ label: proj.name, path: `/tasks?projectId=${projId}` });
              } catch {
                items.push({ label: 'Tasks', path: '/tasks' });
              }
            } else {
              items.push({ label: 'Tasks', path: '/tasks' });
            }

            items.push({ label: parentTask.title, path: `/tasks/${parentId}` });
            items.push({ label: task.title, path: `/tasks/${taskMatch[1]}` });
          } else {
            if (task?.projectId) {
              const projId = task.projectId._id || task.projectId;
              try {
                const projRes = await api.get(`/api/projects/${projId}`);
                const proj = projRes.data?.data?.project || projRes.data?.data;
                items.push({ label: 'Projects', path: '/projects' });
                items.push({ label: proj.name, path: `/tasks?projectId=${projId}` });
              } catch {
                items.push({ label: 'Tasks', path: '/tasks' });
              }
            } else {
              items.push({ label: 'Tasks', path: '/tasks' });
            }
            items.push({ label: task.title, path: `/tasks/${taskMatch[1]}` });
          }

          if (path.endsWith('/edit')) {
            items.push({ label: 'Edit', path });
          }
        } catch {
          items.push({ label: 'Tasks', path: '/tasks' });
          items.push({ label: 'Task Details', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 4. Goals Routes
      if (path === '/goals') {
        items.push({ label: 'Goals', path: '/goals' });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/goals/create') {
        items.push({ label: 'Goals', path: '/goals' });
        items.push({ label: 'Create Goal', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      const goalMatch = path.match(/^\/goals\/([a-f0-9]{24})/i);
      if (goalMatch) {
        items.push({ label: 'Goals', path: '/goals' });
        try {
          const res = await api.get(`/api/goals/${goalMatch[1]}`);
          const goal = res.data?.data;
          items.push({ label: goal?.title || 'Goal Details', path: `/goals/${goalMatch[1]}` });
          if (path.endsWith('/edit')) {
            items.push({ label: 'Edit', path });
          }
        } catch {
          items.push({ label: 'Goal Details', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 5. Sprint Board Route
      const sprintMatch = path.match(/^\/sprints\/([a-f0-9]{24})/i);
      if (sprintMatch) {
        try {
          const res = await api.get(apiPaths.SPRINTS.GET.replace(':id', sprintMatch[1]));
          const sprint = res.data?.data?.sprint || res.data?.data;
          if (sprint?.projectId) {
            const projId = typeof sprint.projectId === 'object' ? sprint.projectId._id : sprint.projectId;
            try {
              const projRes = await api.get(`/api/projects/${projId}`);
              const proj = projRes.data?.data?.project || projRes.data?.data;
              items.push({ label: 'Projects', path: '/projects' });
              items.push({ label: proj?.name || 'Project', path: `/tasks?projectId=${projId}` });
              items.push({ label: 'Sprints', path: `/projects/${projId}/sprints` });
            } catch {
              items.push({ label: 'Tasks', path: '/tasks' });
            }
          } else {
            items.push({ label: 'Tasks', path: '/tasks' });
          }
          items.push({ label: sprint?.name || 'Sprint Board', path });
        } catch {
          items.push({ label: 'Tasks', path: '/tasks' });
          items.push({ label: 'Sprint Board', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 6. Users & Profile Routes
      if (path === '/users') {
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab === 'teams') {
          items.push({ label: 'Users & Teams', path: '/users?tab=teams' });
        } else {
          items.push({ label: 'Users & Teams', path: '/users' });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/users/profile') {
        items.push({ label: 'Profile', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/users/performance') {
        items.push({ label: 'My Performance', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      const userPerfMatch = path.match(/^\/users\/([a-f0-9]{24})\/performance/i);
      if (userPerfMatch) {
        items.push({ label: 'Users & Teams', path: '/users' });
        try {
          const res = await api.get(apiPaths.USERS.GET_USER_BY_ID.replace(':id', userPerfMatch[1]));
          const u = res.data?.data;
          const name = u?.name || u?.fullName || u?.email || 'User';
          items.push({ label: `${name}'s Performance`, path });
        } catch {
          items.push({ label: 'User Performance', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 7. Teams Routes
      if (path === '/teams') {
        items.push({ label: 'Users & Teams', path: '/users?tab=teams' });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      if (path === '/teams/performance') {
        items.push({ label: 'Users & Teams', path: '/users?tab=teams' });
        items.push({ label: 'Team Performance', path });
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      const teamPerfMatch = path.match(/^\/teams\/([a-f0-9]{24})\/performance/i);
      if (teamPerfMatch) {
        items.push({ label: 'Users & Teams', path: '/users?tab=teams' });
        try {
          const res = await api.get(apiPaths.TEAMS.GET.replace(':id', teamPerfMatch[1]));
          const team = res.data?.data;
          items.push({ label: `${team?.name || 'Team'} Performance`, path });
        } catch {
          items.push({ label: 'Team Performance', path });
        }
        if (isSubscribed) setBreadcrumbs(items);
        return;
      }

      // 8. Other Static Routes
      const routeLabels: Record<string, string> = {
        reports: 'Reports',
        resources: 'Resources',
        audit: 'Audit Log',
      };

      const seg = path.replace(/^\//, '').toLowerCase();
      if (routeLabels[seg]) {
        items.push({ label: routeLabels[seg], path });
      } else {
        const segments = path.split('/').filter(Boolean);
        let currentPath = '';
        for (const segment of segments) {
          // Skip raw hex IDs in fallback labels
          if (/^[a-f0-9]{24}$/i.test(segment)) continue;
          currentPath += `/${segment}`;
          const label = routeLabels[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);
          items.push({ label, path: currentPath });
        }
      }

      if (isSubscribed) setBreadcrumbs(items);
    };

    buildBreadcrumbs();

    return () => {
      isSubscribed = false;
    };
  }, [location.pathname, location.search]);

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
