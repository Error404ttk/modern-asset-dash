export type Role = "super_admin" | "admin" | "technician" | "user";

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  admin: "ผู้ดูแลระบบ",
  technician: "ช่างเทคนิค",
  user: "ผู้ใช้งานทั่วไป",
};

export const getRoleDisplayName = (role: Role | string | null | undefined) => {
  if (!role) return ROLE_DISPLAY_NAMES.user;
  if ((role as Role) in ROLE_DISPLAY_NAMES) {
    return ROLE_DISPLAY_NAMES[role as Role];
  }
  return ROLE_DISPLAY_NAMES.user;
};

export type UserAction =
  | "create"
  | "edit-profile"
  | "edit-role"
  | "delete"
  | "view";

export interface RolePermissions {
  role: Role;
  canCreateUsers: boolean;
  canEditProfile: boolean;
  canEditRole: boolean;
  canDeleteUsers: boolean;
  assignableRoles: Role[];
  protectedTargetRoles: Role[];
}

const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  super_admin: {
    role: "super_admin",
    canCreateUsers: true,
    canEditProfile: true,
    canEditRole: true,
    canDeleteUsers: true,
    assignableRoles: ["super_admin", "admin", "technician", "user"],
    protectedTargetRoles: [],
  },
  admin: {
    role: "admin",
    canCreateUsers: true,
    canEditProfile: true,
    canEditRole: true,
    canDeleteUsers: true,
    assignableRoles: ["admin", "technician", "user"],
    protectedTargetRoles: ["super_admin"],
  },
  technician: {
    role: "technician",
    canCreateUsers: false,
    canEditProfile: true,
    canEditRole: false,
    canDeleteUsers: false,
    assignableRoles: ["user"],
    protectedTargetRoles: ["super_admin", "admin"],
  },
  user: {
    role: "user",
    canCreateUsers: false,
    canEditProfile: false,
    canEditRole: false,
    canDeleteUsers: false,
    assignableRoles: [],
    protectedTargetRoles: ["super_admin", "admin", "technician", "user"],
  },
};

export const getRolePermissions = (role: Role | string | null | undefined): RolePermissions => {
  if (!role) return ROLE_PERMISSIONS.user;
  return ROLE_PERMISSIONS[(role as Role) ?? "user"] ?? ROLE_PERMISSIONS.user;
};

export const canActOnRole = (
  actorPermissions: RolePermissions,
  targetRole: Role,
  action: UserAction,
) => {
  if (action === "view") return true;

  if (actorPermissions.protectedTargetRoles.includes(targetRole)) {
    return false;
  }

  switch (action) {
    case "create":
      return actorPermissions.canCreateUsers;
    case "edit-profile":
      return actorPermissions.canEditProfile;
    case "edit-role":
      return actorPermissions.canEditRole;
    case "delete":
      return actorPermissions.canDeleteUsers;
    default:
      return false;
  }
};

export const sanitizeRoleAssignment = (actorPermissions: RolePermissions, requestedRole: Role): Role => {
  if (actorPermissions.assignableRoles.includes(requestedRole)) {
    return requestedRole;
  }
  return actorPermissions.assignableRoles[0] ?? "user";
};

export const sortRolesByPrivilege = (roles: Role[]) => {
  const weight: Record<Role, number> = {
    super_admin: 3,
    admin: 2,
    technician: 1,
    user: 0,
  };
  return [...roles].sort((a, b) => weight[b] - weight[a]);
};

export const formatJoinedDate = (isoString?: string | null) => {
  if (!isoString) return "ไม่ระบุ";
  try {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(isoString));
  } catch {
    return "ไม่ระบุ";
  }
};
