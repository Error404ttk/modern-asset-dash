import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getRoleDisplayName,
  sanitizeRoleAssignment,
  type Role,
  type RolePermissions,
} from "@/utils/rbac";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  roleCode?: Role;
  status: string;
  lastLogin: string;
  createdAt: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: () => void;
  departmentOptions: Array<{ id: string; name: string }>;
  departmentLoadError: string | null;
  roleOptions: Array<{ value: Role; label: string }>;
  noDepartmentValue: string;
  permissions: RolePermissions;
  canEditRole: boolean;
}

const DEFAULT_ROLE: Role = "user";

export const EditUserDialog = ({
  open,
  onOpenChange,
  user,
  onUserUpdated,
  departmentOptions,
  departmentLoadError,
  roleOptions,
  noDepartmentValue,
  permissions,
  canEditRole,
}: EditUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    department:
      user?.department && user.department !== "ไม่ระบุหน่วยงาน"
        ? user.department
        : noDepartmentValue,
    role: (user?.roleCode as Role | undefined) ?? DEFAULT_ROLE,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        department:
          user.department && user.department !== "ไม่ระบุหน่วยงาน"
            ? user.department
            : noDepartmentValue,
        role: (user.roleCode as Role | undefined) ?? DEFAULT_ROLE,
      });
    }
  }, [user, noDepartmentValue, open]);

  const resolvedRoleOptions = useMemo(() => {
    if (!user) return roleOptions;
    if (user.roleCode === "super_admin" && !roleOptions.some((option) => option.value === "super_admin")) {
      return [{ value: "super_admin", label: getRoleDisplayName("super_admin") }, ...roleOptions];
    }
    return roleOptions;
  }, [roleOptions, user]);

  const canEditProfile = permissions.canEditProfile;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !canEditProfile) return;

    const trimmedFullName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedFullName) {
      toast({
        title: "กรุณากรอกชื่อ",
        description: "จำเป็นต้องระบุชื่อ-นามสกุล",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedEmail) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "จำเป็นต้องระบุอีเมล",
        variant: "destructive",
      });
      return;
    }

    const roleToAssign = sanitizeRoleAssignment(permissions, formData.role as Role);

    setLoading(true);

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

      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          userId: user.id,
          fullName: trimmedFullName,
          email: trimmedEmail,
          department: formData.department === noDepartmentValue ? null : formData.department,
          role: roleToAssign,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error("update-user edge error", { error, data });

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
              console.warn("Failed to parse update-user edge error body", parseError);
            }
          }

          return error.message;
        })();

        throw new Error(edgeErrorMessage);
      }

      if (!data?.success) {
        throw new Error(data?.error || "ไม่สามารถบันทึกการแก้ไขได้");
      }

      toast({
        title: "แก้ไขข้อมูลสำเร็จ",
        description: `แก้ไขข้อมูลผู้ใช้งาน ${trimmedFullName} เรียบร้อยแล้ว`,
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            แก้ไขข้อมูลผู้ใช้งาน
          </DialogTitle>
          <DialogDescription>แก้ไขข้อมูลของ {user.fullName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ชื่อผู้ใช้</Label>
            <Input id="username" value={user.username} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">ไม่สามารถแก้ไขชื่อผู้ใช้ได้</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="ชื่อ-นามสกุล"
              required
              disabled={!canEditProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="email@department.go.th"
              required
              disabled={!canEditProfile}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">หน่วยงาน</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                disabled={!canEditProfile || (departmentOptions.length === 0 && !departmentLoadError)}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="เลือกหน่วยงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noDepartmentValue}>ไม่ระบุ</SelectItem>
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
                value={formData.role}
                onValueChange={(value: Role) => setFormData((prev) => ({ ...prev, role: value }))}
                disabled={!canEditRole}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {resolvedRoleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">บทบาทปัจจุบัน: {user.role}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !canEditProfile}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกการแก้ไข
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
