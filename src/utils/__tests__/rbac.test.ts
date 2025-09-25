import {
  canActOnRole,
  getRolePermissions,
  sanitizeRoleAssignment,
  sortRolesByPrivilege,
  type Role,
} from "@/utils/rbac";

describe("RBAC utilities", () => {
  it("allows super admin to manage every role", () => {
    const perms = getRolePermissions("super_admin");
    const targetRoles: Role[] = ["super_admin", "admin", "technician", "user"];

    targetRoles.forEach((role) => {
      expect(canActOnRole(perms, role, "edit-profile")).toBe(true);
      expect(canActOnRole(perms, role, "edit-role")).toBe(true);
      expect(canActOnRole(perms, role, "delete")).toBe(true);
    });
  });

  it("prevents admin from editing or deleting super admin", () => {
    const perms = getRolePermissions("admin");

    expect(canActOnRole(perms, "super_admin", "edit-profile")).toBe(false);
    expect(canActOnRole(perms, "super_admin", "delete")).toBe(false);
    expect(canActOnRole(perms, "super_admin", "edit-role")).toBe(false);

    expect(canActOnRole(perms, "technician", "edit-profile")).toBe(true);
    expect(canActOnRole(perms, "technician", "delete")).toBe(true);
  });

  it("sanitizes role assignments based on actor permissions", () => {
    const adminPerms = getRolePermissions("admin");
    expect(sanitizeRoleAssignment(adminPerms, "super_admin")).toBe("admin");
    expect(sanitizeRoleAssignment(adminPerms, "technician")).toBe("technician");

    const technicianPerms = getRolePermissions("technician");
    expect(sanitizeRoleAssignment(technicianPerms, "admin")).toBe("user");
    expect(sanitizeRoleAssignment(technicianPerms, "user")).toBe("user");
  });

  it("limits technician actions to non-administrative accounts", () => {
    const technicianPerms = getRolePermissions("technician");

    expect(canActOnRole(technicianPerms, "admin", "edit-profile")).toBe(false);
    expect(canActOnRole(technicianPerms, "user", "edit-profile")).toBe(true);
    expect(canActOnRole(technicianPerms, "user", "delete")).toBe(false);
  });

  it("sorts roles from highest to lowest privilege", () => {
    const roles: Role[] = ["user", "super_admin", "technician", "admin"];
    expect(sortRolesByPrivilege(roles)).toEqual([
      "super_admin",
      "admin",
      "technician",
      "user",
    ]);
  });
});
