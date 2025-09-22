import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  status: string;
  lastLogin: string;
  createdAt: string;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserDeleted: () => void;
}

export const DeleteUserDialog = ({ open, onOpenChange, user, onUserDeleted }: DeleteUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [superAdminPassword, setSuperAdminPassword] = useState("");

  const handleDelete = async () => {
    if (!user) return;

    if (!reason.trim()) {
      toast({
        title: "กรุณาระบุเหตุผล",
        description: "กรุณาระบุเหตุผลในการลบผู้ใช้งาน",
        variant: "destructive",
      });
      return;
    }

    if (!superAdminPassword.trim()) {
      toast({
        title: "กรุณาใส่รหัสผ่าน",
        description: "กรุณาใส่รหัสผ่านผู้ดูแลระบบสูงสุดเพื่อยืนยัน",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: user.id,
          reason: reason.trim(),
          superAdminPassword: superAdminPassword.trim()
        }
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "ไม่สามารถลบได้",
          description: data.error || "รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "ลบผู้ใช้งานสำเร็จ",
        description: `ลบผู้ใช้งาน ${user.fullName} เรียบร้อยแล้ว`,
      });

      onUserDeleted();
      onOpenChange(false);
      setReason("");
      setSuperAdminPassword("");
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบผู้ใช้งานได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            ยืนยันการลบผู้ใช้งาน
          </DialogTitle>
          <DialogDescription>
            การดำเนินการนี้ไม่สามารถยกเลิกได้ ผู้ใช้งานจะถูกลบออกจากระบบถาวร
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-destructive">ต้องการลบผู้ใช้งาน</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">ชื่อ:</span> {user.fullName}</p>
                  <p><span className="font-medium">ชื่อผู้ใช้:</span> {user.username}</p>
                  <p><span className="font-medium">อีเมล:</span> {user.email}</p>
                  <p><span className="font-medium">หน่วยงาน:</span> {user.department}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผลในการลบ *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลในการลบผู้ใช้งาน เช่น ลาออก, โอนย้าย, ฯลฯ"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="superAdminPassword">รหัสผ่านผู้ดูแลระบบสูงสุด *</Label>
            <Input
              id="superAdminPassword"
              type="password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder="ใส่รหัสผ่านของ Super Admin เพื่อยืนยัน"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setReason("");
                setSuperAdminPassword("");
              }}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบผู้ใช้งาน
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};