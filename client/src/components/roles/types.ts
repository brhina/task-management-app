import { PERMISSIONS, type Permission } from '../../constants/permissions';

export interface SystemRoleRow {
  role: string;
  label: string;
  permissions: string[];
  isSystem: boolean;
}

export interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface OrgMemberData {
  _id: string;
  userId?: { _id: string; name: string; email: string; profileImageUrl?: string } | any;
  role: string;
  customRoleId?: { _id: string; name: string; permissions?: string[] } | any;
}

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'tasks',
    name: 'Task Management',
    description: 'Viewing, creating, updating, assigning, and deleting tasks',
    permissions: ['task:view', 'task:create', 'task:update', 'task:delete', 'task:assign'],
  },
  {
    id: 'projects',
    name: 'Project Management',
    description: 'Viewing, creating, managing, and deleting projects',
    permissions: ['project:view', 'project:create', 'project:update', 'project:delete', 'project:manage'],
  },
  {
    id: 'goals',
    name: 'Goals & OKRs',
    description: 'Viewing and managing organization goals and OKRs',
    permissions: ['goal:view', 'goal:manage'],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Viewing performance dashboards and exporting reports',
    permissions: ['report:view', 'report:export'],
  },
  {
    id: 'members',
    name: 'Members & Organization',
    description: 'Inviting members, managing profiles, role administration, and audit logs',
    permissions: ['member:invite', 'member:manage', 'org:manage', 'org:audit', 'role:manage'],
  },
  {
    id: 'teams',
    name: 'Team & Department',
    description: 'Viewing and managing team structures and leadership',
    permissions: ['team:view', 'team:manage'],
  },
  {
    id: 'automation',
    name: 'Automations & Templates',
    description: 'Managing task templates and automated workflow rules',
    permissions: ['automation:manage', 'template:manage'],
  },
];
