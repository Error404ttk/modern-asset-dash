import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  roleCode?: string;
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
  roleOptions: Array<{ value: string; label: string }>;
  noDepartmentValue: string;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  admin: "ผู้ดูแลระบบ",
  user: "ผู้ใช้งานทั่วไป",
};

const DEFAULT_ROLE = "user";

export const EditUserDialog = ({
  open,
  onOpenChange,
  user,
  onUserUpdated,
  departmentOptions,
  departmentLoadError,
  roleOptions,
  noDepartmentValue,
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
    role: user?.roleCode || DEFAULT_ROLE,
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
        role: user.roleCode || DEFAULT_ROLE,
      });
    }
  }, [user, noDepartmentValue, open]);

  const roleOptionsWithSuperAdmin = useMemo(() => {
    if (!user) return roleOptions;
    if (user.roleCode === "super_admin" && !roleOptions.some((option) => option.value === "super_admin")) {
      return [{ value: "super_admin", label: ROLE_LABEL_MAP["super_admin"] }, ...roleOptions];
    }
    return roleOptions;
  }, [user, roleOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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

      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          fullName: trimmedFullName,
          email: trimmedEmail,
          department: formData.department === noDepartmentValue ? null : formData.department,
          role: formData.role,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'ไม่สามารถบันทึกการแก้ไขได้');
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
          <DialogDescription>
            แก้ไขข้อมูลของ {user.fullName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ชื่อผู้ใช้</Label>
            <Input 
              id="username"
              value={user.username}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">ไม่สามารถแก้ไขชื่อผู้ใช้ได้</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
            <Input 
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="ชื่อ-นามสกุล"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input 
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@department.go.th"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">หน่วยงาน</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                disabled={departmentOptions.length === 0 && !departmentLoadError}
              >
                <SelectTrigger>
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาท">
                    {ROLE_LABEL_MAP[formData.role as keyof typeof ROLE_LABEL_MAP] || 'เลือกบทบาท'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roleOptionsWithSuperAdmin.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกการแก้ไข
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
