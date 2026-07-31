export const PERMISSIONS = [
  'task:view',
  'task:create',
  'task:update',
  'task:delete',
  'task:assign',
  'project:view',
  'project:create',
  'project:update',
  'project:delete',
  'project:manage',
  'goal:view',
  'goal:manage',
  'report:view',
  'report:export',
  'member:invite',
  'member:manage',
  'org:manage',
  'org:audit',
  'role:manage',
  'team:view',
  'team:manage',
  'automation:manage',
  'template:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLES = ['Owner', 'OrgAdmin', 'Manager', 'OrgMember', 'Viewer'] as const;

export type SystemOrgRole = (typeof SYSTEM_ROLES)[number];
export type OrgRole = SystemOrgRole | 'Custom';

const ALL: Permission[] = [...PERMISSIONS];

const VIEWER: Permission[] = [
  'task:view',
  'project:view',
  'goal:view',
  'report:view',
  'team:view',
];

const MEMBER: Permission[] = [...VIEWER, 'task:update'];

const MANAGER: Permission[] = [
  ...MEMBER,
  'task:create',
  'task:delete',
  'task:assign',
  'project:create',
  'project:update',
  'project:delete',
  'project:manage',
  'goal:manage',
  'report:export',
  'member:invite',
  'team:manage',
  'template:manage',
];

const ADMIN: Permission[] = ALL;

export const ROLE_PERMISSIONS: Record<SystemOrgRole, Permission[]> = {
  Owner: ALL,
  OrgAdmin: ADMIN, // Org admin is the org owner — full permission set
  Manager: MANAGER,
  OrgMember: MEMBER,
  Viewer: VIEWER,
};

export const ROLE_LABELS: Record<SystemOrgRole, string> = {
  Owner: 'Owner',
  OrgAdmin: 'Owner',
  Manager: 'Manager',
  OrgMember: 'Member',
  Viewer: 'Viewer',
};

export const ADMIN_SUITE_ROLES: OrgRole[] = ['Owner', 'OrgAdmin', 'Manager'];

export function isOrgOwnerRole(role: string | null | undefined): boolean {
  return role === 'Owner' || role === 'OrgAdmin';
}

export function isSystemRole(role: string): role is SystemOrgRole {
  return (SYSTEM_ROLES as readonly string[]).includes(role);
}

export function getPermissionsForRole(
  role: string | null | undefined,
  customPermissions?: string[]
): Permission[] {
  if (!role) return [];
  if (role === 'Custom') return (customPermissions || []) as Permission[];
  if (isSystemRole(role)) return ROLE_PERMISSIONS[role];
  return ROLE_PERMISSIONS.OrgMember;
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
  customPermissions?: string[]
): boolean {
  return getPermissionsForRole(role, customPermissions).includes(permission);
}

export function canAccessAdminSuite(role: string | null | undefined): boolean {
  return ADMIN_SUITE_ROLES.includes(role as OrgRole);
}
