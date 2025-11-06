import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  ShieldCheck,
  Users as UsersIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ViewUserDialog } from "@/components/users/ViewUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  canActOnRole,
  formatJoinedDate,
  getRoleDisplayName,
  getRolePermissions,
  sanitizeRoleAssignment,
  sortRolesByPrivilege,
  type Role,
} from "@/utils/rbac";
import { getCachedData, setCachedData } from "@/utils/cache";

const NO_DEPARTMENT_VALUE = "__none__";
const DEPARTMENT_CACHE_KEY = "departments-active";
const DEPARTMENT_CACHE_TTL = 1000 * 60 * 60 * 12;

interface SupabaseProfile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  department: string | null;
  role: Role | null;
  created_at: string;
  last_login_at?: string | null;
}

export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  roleCode: Role;
  status: string;
  lastLogin: string;
  createdAt: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface NewUserFormState {
  email: string;
  password: string;
  fullName: string;
  department: string;
  role: Role;
}

const ALL_ROLE_OPTIONS: Array<{ value: Role; label: string }> = sortRolesByPrivilege([
  "super_admin",
  "admin",
  "technician",
  "user",
]).map((role) => ({ value: role, label: getRoleDisplayName(role) }));

const buildUserRow = (profile: SupabaseProfile): UserRow => {
  const roleCode = profile.role ?? "user";
  const email = profile.email ?? "-";
  const username = email.includes("@") ? email.split("@")[0] : email;

  return {
    id: profile.user_id,
    username: username || profile.user_id.slice(0, 6),
    fullName: profile.full_name?.trim() || "ไม่ระบุชื่อ",
    email,
    department: profile.department?.trim() || "ไม่ระบุหน่วยงาน",
    role: getRoleDisplayName(roleCode),
    roleCode,
    status: "ใช้งาน",
    lastLogin: profile.last_login_at ? formatJoinedDate(profile.last_login_at) : "ไม่ระบุ",
    createdAt: formatJoinedDate(profile.created_at),
  };
};

const filterUsers = (users: UserRow[], term: string) => {
  const keyword = term.trim().toLowerCase();
  if (!keyword) return users;
  return users.filter((user) =>
    [user.fullName, user.username, user.email, user.department, user.role]
      .join(" ")
      .toLowerCase()
      .includes(keyword),
  );
};

const Users = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const currentRole = profile?.role ?? "user";
  const rolePermissions = useMemo(() => getRolePermissions(currentRole), [currentRole]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(null);

  const initialRole = useMemo(() => rolePermissions.assignableRoles[0] ?? "user", [rolePermissions.assignableRoles]);

  const [newUserForm, setNewUserForm] = useState<NewUserFormState>({
    email: "",
    password: "",
    fullName: "",
    department: NO_DEPARTMENT_VALUE,
    role: initialRole,
  });

  useEffect(() => {
    setNewUserForm((prev) => ({
      ...prev,
      role: sanitizeRoleAssignment(rolePermissions, prev.role),
    }));
  }, [rolePermissions]);

  const availableRoleOptions = useMemo(
    () =>
      ALL_ROLE_OPTIONS.filter((option) => rolePermissions.assignableRoles.includes(option.value)),
    [rolePermissions.assignableRoles],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const runQuery = async (columns: string) => {
        const ordered = await supabase
          .from("profiles")
          .select(columns)
          .order("created_at", { ascending: false });

        if (ordered.error && ordered.error.code === "42703") {
          // Column missing in ORDER BY, fall back to natural order
          return supabase.from("profiles").select(columns);
        }

        if (ordered.error && ordered.error.code === "PGRST302") {
          // PostgREST can't apply order without select alias; retry without ordering
          return supabase.from("profiles").select(columns);
        }

        return ordered;
      };

      const { data, error } = await runQuery("user_id, email, full_name, department, role, created_at");

      const missingDepartmentColumn = error?.message?.toLowerCase().includes("department") || error?.code === "PGRST204";

      if (error && !missingDepartmentColumn) {
        throw error;
      }

      if (error && missingDepartmentColumn) {
        console.warn("Department column not available; falling back to legacy schema", error);
        const fallback = await runQuery("user_id, email, full_name, role, created_at, updated_at");
        if (fallback.error) {
          throw fallback.error;
        }
        const transformedFallback = (fallback.data ?? []).map((record: any) => {
          // Create a new object that matches the SupabaseProfile type
          const profile: Omit<SupabaseProfile, 'updated_at'> & { updated_at?: string } = {
            user_id: record.user_id,
            email: record.email,
            full_name: record.full_name,
            role: record.role as Role,
            created_at: record.created_at,
            department: null,
            ...(record.updated_at && { updated_at: record.updated_at })
          };
          return buildUserRow(profile as SupabaseProfile);
        });
        setUsers(transformedFallback);
        return;
      }

      const transformed = (data ?? []).map((record: unknown) => {
        // Safely cast the record to SupabaseProfile with runtime type checking
        const profile = record as SupabaseProfile;
        return buildUserRow(profile);
      });
      setUsers(transformed);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    try {
      setDepartmentLoadError(null);
      const cached = getCachedData<DepartmentOption[]>(DEPARTMENT_CACHE_KEY);
      if (cached) {
        setDepartmentOptions(cached);
        return;
      }

      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) throw error;

      const options = data ?? [];
      setDepartmentOptions(options);
      setCachedData(DEPARTMENT_CACHE_KEY, options, DEPARTMENT_CACHE_TTL);
    } catch (error) {
      console.error("Error fetching departments:", error);
      if (departmentOptions.length === 0) {
        setDepartmentLoadError("ไม่สามารถโหลดรายชื่อหน่วยงานได้");
      }
    }
  }, [departmentOptions.length]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const resetAddUserForm = useCallback(() => {
    setNewUserForm({
      email: "",
      password: "",
      fullName: "",
      department: NO_DEPARTMENT_VALUE,
      role: rolePermissions.assignableRoles[0] ?? "user",
    });
    setAddError(null);
  }, [rolePermissions.assignableRoles]);

  const handleAddUserSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAddError(null);

      if (!rolePermissions.canCreateUsers) {
        toast({
          title: "ไม่มีสิทธิ์",
          description: "สิทธิ์ปัจจุบันไม่สามารถเพิ่มผู้ใช้งานได้",
          variant: "destructive",
        });
        return;
      }

      const email = newUserForm.email.trim();
      const password = newUserForm.password.trim();
      const fullName = newUserForm.fullName.trim();

      if (!email || !password || !fullName) {
        setAddError("กรุณากรอกอีเมล รหัสผ่าน และชื่อ-นามสกุล");
        return;
      }

      if (password.length < 6) {
        setAddError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }

      const normalizedRole = sanitizeRoleAssignment(rolePermissions, newUserForm.role);

      setAddLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("ไม่พบ token สำหรับยืนยันตัวตน");
        }

        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            email,
            password,
            fullName,
            department:
              newUserForm.department === NO_DEPARTMENT_VALUE ? null : newUserForm.department || null,
            role: normalizedRole,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (error) {
          console.error("create-user edge error", { error, data });

          const edgeErrorMessage = (() => {
            if (data && typeof data === "object" && "error" in data && typeof (data as any).error === "string") {
              return (data as any).error as string;
            }

            const context = (error as unknown as { context?: { body?: string } }).context;
            if (context?.body) {
              try {
                const parsed = JSON.parse(context.body);
                if (parsed && typeof parsed.error === "string") {
                  return parsed.error;
                }
              } catch (parseError) {
                console.warn("Failed to parse edge error body", parseError);
              }
            }

            return error.message;
          })();

          throw new Error(edgeErrorMessage);
        }

        if (!data?.success) {
          throw new Error(data?.error || "ไม่สามารถเพิ่มผู้ใช้งานได้");
        }

        toast({
          title: "เพิ่มผู้ใช้งานสำเร็จ",
          description: "เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว",
        });

        resetAddUserForm();
        setIsAddDialogOpen(false);
        await fetchUsers();
      } catch (err) {
        console.error("Error creating user:", err);
        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน";
        setAddError(message);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: message,
          variant: "destructive",
        });
      } finally {
        setAddLoading(false);
      }
    },
    [fetchUsers, newUserForm.department, newUserForm.email, newUserForm.fullName, newUserForm.password, resetAddUserForm, rolePermissions, toast],
  );

  const handleViewUser = useCallback((user: UserRow) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  }, []);

  const canEditUser = useCallback(
    (user: UserRow) => canActOnRole(rolePermissions, user.roleCode, "edit-profile"),
    [rolePermissions],
  );

  const canEditUserRole = useCallback(
    (user: UserRow) => rolePermissions.canEditRole && canActOnRole(rolePermissions, user.roleCode, "edit-role"),
    [rolePermissions],
  );

  const canDeleteUser = useCallback(
    (user: UserRow) =>
      canActOnRole(rolePermissions, user.roleCode, "delete") && user.id !== profile?.user_id,
    [profile?.user_id, rolePermissions],
  );

  const handleEditUser = useCallback(
    (user: UserRow) => {
      if (!canEditUser(user)) {
        toast({
          title: "ไม่มีสิทธิ์",
          description: "สิทธิ์ปัจจุบันไม่สามารถแก้ไขผู้ใช้งานนี้ได้",
          variant: "destructive",
        });
        return;
      }
      setSelectedUser(user);
      setEditDialogOpen(true);
    },
    [canEditUser, toast],
  );

  const handleDeleteUser = useCallback(
    (user: UserRow) => {
      if (!canDeleteUser(user)) {
        toast({
          title: "ไม่มีสิทธิ์",
          description: "สิทธิ์ปัจจุบันไม่สามารถลบผู้ใช้งานนี้ได้",
          variant: "destructive",
        });
        return;
      }
      setSelectedUser(user);
      setDeleteDialogOpen(true);
    },
    [canDeleteUser, toast],
  );

  const handleUserUpdated = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserDeleted = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => filterUsers(users, searchTerm), [searchTerm, users]);
  const isReadOnly =
    !rolePermissions.canCreateUsers && !rolePermissions.canEditProfile && !rolePermissions.canDeleteUsers;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">จัดการผู้ใช้งาน</h1>
            <p className="text-muted-foreground mt-2">
              ควบคุมสิทธิ์การเข้าถึงระบบและติดตามสถานะผู้ใช้งาน
            </p>
          </div>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(openDialog) => {
              setIsAddDialogOpen(openDialog);
              if (!openDialog) {
                resetAddUserForm();
              } else {
                setAddError(null);
              }
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <span>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      disabled={!rolePermissions.canCreateUsers}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      เพิ่มผู้ใช้งาน
                    </Button>
                  </span>
                </DialogTrigger>
              </TooltipTrigger>
              {!rolePermissions.canCreateUsers && (
                <TooltipContent>
                  <p>สิทธิ์ปัจจุบันไม่อนุญาตให้เพิ่มผู้ใช้งาน</p>
                </TooltipContent>
              )}
            </Tooltip>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>เพิ่มผู้ใช้งานใหม่</DialogTitle>
                <DialogDescription>กรอกข้อมูลผู้ใช้งานและกำหนดบทบาทการเข้าถึงระบบ</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4 py-4" onSubmit={handleAddUserSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserForm.email}
                      onChange={(event) => setNewUserForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="email@department.go.th"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">รหัสผ่าน *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserForm.password}
                      onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">ชื่อ-นามสกุล *</Label>
                  <Input
                    id="fullName"
                    value={newUserForm.fullName}
                    onChange={(event) => setNewUserForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="ชื่อ-นามสกุล"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">หน่วยงาน</Label>
                    <Select
                      value={newUserForm.department}
                      onValueChange={(value) => setNewUserForm((prev) => ({ ...prev, department: value }))}
                      disabled={departmentOptions.length === 0 && !departmentLoadError}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="เลือกหน่วยงาน" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT_VALUE}>ไม่ระบุ</SelectItem>
                        {departmentOptions.map((option) => (
                          <SelectItem key={option.id} value={option.name}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {departmentLoadError && (
                      <p className="text-xs text-destructive">{departmentLoadError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">บทบาท</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: Role) => setNewUserForm((prev) => ({ ...prev, role: value }))}
                      disabled={!rolePermissions.canCreateUsers || availableRoleOptions.length === 0}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="เลือกบทบาท" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetAddUserForm();
                    }}
                    disabled={addLoading}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={addLoading}
                  >
                    {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    เพิ่มผู้ใช้งาน
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isReadOnly && (
          <Card className="border-dashed border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-warning-foreground">
              <Shield className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-medium">โหมดแสดงผลเท่านั้น</p>
                <p className="text-warning-foreground/80">
                  บทบาทผู้ใช้งานทั่วไปสามารถดูข้อมูลได้ แต่ไม่สามารถสร้าง แก้ไข หรือลบผู้ใช้งาน
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาผู้ใช้งาน, อีเมล หรือหน่วยงาน..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <UsersIcon className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ผู้ใช้งานทั้งหมด</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Activity className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">ใช้งานปกติ</p>
                <p className="text-2xl font-bold">
                  {users.filter((user) => user.status === "ใช้งาน").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> รายการผู้ใช้งาน
            </CardTitle>
            <CardDescription>
              แสดง {loading ? "..." : filteredUsers.length} ผู้ใช้งานจากทั้งหมด {users.length} คน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลดข้อมูลผู้ใช้งาน
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">ไม่พบผู้ใช้งาน</h3>
                <p className="text-muted-foreground">ไม่มีผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ผู้ใช้งาน</TableHead>
                      <TableHead>หน่วยงาน</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="whitespace-nowrap">วันที่เข้าร่วม</TableHead>
                      <TableHead className="whitespace-nowrap">เข้าใช้ล่าสุด</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userRow) => {
                      const editable = canEditUser(userRow);
                      const deletable = canDeleteUser(userRow);

                      return (
                        <TableRow key={userRow.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{userRow.fullName}</p>
                              <p className="text-xs text-muted-foreground">@{userRow.username} • {userRow.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{userRow.department}</TableCell>
                          <TableCell>
                            <Badge variant={userRow.roleCode === "super_admin" ? "destructive" : "default"}>
                              {userRow.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={userRow.status === "ใช้งาน" ? "default" : "secondary"}>
                              {userRow.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{userRow.createdAt}</TableCell>
                          <TableCell>{userRow.lastLogin}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="outline" onClick={() => handleViewUser(userRow)}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">ดูข้อมูลผู้ใช้งาน</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>ดูรายละเอียด</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => handleEditUser(userRow)}
                                      disabled={!editable}
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">แก้ไขผู้ใช้งาน</span>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!editable && (
                                  <TooltipContent>ไม่มีสิทธิ์แก้ไขผู้ใช้งานนี้</TooltipContent>
                                )}
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => handleDeleteUser(userRow)}
                                      disabled={!deletable}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">ลบผู้ใช้งาน</span>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!deletable && (
                                  <TooltipContent>ไม่มีสิทธิ์ลบผู้ใช้งานนี้</TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <ViewUserDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} user={selectedUser} />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
          departmentOptions={departmentOptions}
          departmentLoadError={departmentLoadError}
          roleOptions={availableRoleOptions}
          noDepartmentValue={NO_DEPARTMENT_VALUE}
          permissions={rolePermissions}
          canEditRole={selectedUser ? canEditUserRole(selectedUser) : false}
        />

        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUser}
          onUserDeleted={handleUserDeleted}
          canDelete={selectedUser ? canDeleteUser(selectedUser) : false}
        />
      </div>
    </TooltipProvider>
  );
};

export default Users;
