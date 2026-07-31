export const PERMISSIONS = [
  "task:view",
  "task:create",
  "task:update",
  "task:delete",
  "task:assign",
  "project:view",
  "project:create",
  "project:update",
  "project:delete",
  "project:manage",
  "goal:view",
  "goal:manage",
  "report:view",
  "report:export",
  "member:invite",
  "member:manage",
  "org:manage",
  "org:audit",
  "role:manage",
  "team:view",
  "team:manage",
  "automation:manage",
  "template:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLES = [
  "Owner",
  "OrgAdmin",
  "Manager",
  "OrgMember",
  "Viewer",
] as const;

export type SystemOrgRole = (typeof SYSTEM_ROLES)[number];

/** All roles that may appear on a membership (Custom uses customRoleId). */
export type OrgRole = SystemOrgRole | "Custom";

const ALL: Permission[] = [...PERMISSIONS];

const VIEWER: Permission[] = [
  "task:view",
  "project:view",
  "goal:view",
  "report:view",
  "team:view",
];

const MEMBER: Permission[] = [
  ...VIEWER,
  "task:update", // own status/checklist still enforced in controllers where needed
];

const MANAGER: Permission[] = [
  ...MEMBER,
  "task:create",
  "task:delete",
  "task:assign",
  "project:create",
  "project:update",
  "project:delete",
  "project:manage",
  "goal:manage",
  "report:export",
  "member:invite",
  "team:manage",
  "template:manage",
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
  Owner: "Owner",
  OrgAdmin: "Owner",
  Manager: "Manager",
  OrgMember: "Member",
  Viewer: "Viewer",
};

/** Top-level org ownership roles (full access). */
export const ELEVATED_ROLES: SystemOrgRole[] = ["Owner", "OrgAdmin"];

export function isOrgOwnerRole(role: string | null | undefined): boolean {
  return role === "Owner" || role === "OrgAdmin";
}

export function isSystemRole(role: string): role is SystemOrgRole {
  return (SYSTEM_ROLES as readonly string[]).includes(role);
}

export function getPermissionsForSystemRole(role: string): Permission[] {
  if (isSystemRole(role)) return ROLE_PERMISSIONS[role];
  // Backward compat: treat unknown as member
  if (role === "Custom") return [];
  return ROLE_PERMISSIONS.OrgMember;
}

export function roleHasPermission(
  role: string,
  permission: Permission,
  customPermissions?: string[],
): boolean {
  if (role === "Custom" && customPermissions) {
    return customPermissions.includes(permission);
  }
  return getPermissionsForSystemRole(role).includes(permission);
}
