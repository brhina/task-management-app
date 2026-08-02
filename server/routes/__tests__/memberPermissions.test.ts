import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSIONS,
  getPermissionsForSystemRole,
  isOrgOwnerRole,
  roleHasPermission,
} from "../../constants/permissions.js";

describe("Member Permissions Scoping", () => {
  it("OrgMember should not have enterprise permissions or global report:view", () => {
    const memberPerms = getPermissionsForSystemRole("OrgMember");
    expect(memberPerms).not.toContain("org:manage");
    expect(memberPerms).not.toContain("org:audit");
    expect(memberPerms).not.toContain("role:manage");
    expect(memberPerms).not.toContain("report:view");
    expect(memberPerms).not.toContain("report:export");
    expect(memberPerms).not.toContain("member:manage");
  });

  it("OrgAdmin & Owner should be recognized as elevated owner roles", () => {
    expect(isOrgOwnerRole("Owner")).toBe(true);
    expect(isOrgOwnerRole("OrgAdmin")).toBe(true);
    expect(isOrgOwnerRole("OrgMember")).toBe(false);
    expect(isOrgOwnerRole("Viewer")).toBe(false);
  });

  it("roleHasPermission evaluates system roles correctly", () => {
    expect(roleHasPermission("OrgAdmin", "org:manage")).toBe(true);
    expect(roleHasPermission("OrgMember", "org:manage")).toBe(false);
    expect(roleHasPermission("OrgMember", "task:view")).toBe(true);
  });
});
