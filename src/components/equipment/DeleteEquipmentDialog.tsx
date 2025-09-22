import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  assetNumber: string;
  serialNumber: string;
}

interface DeleteEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
  onDeleted: () => void;
}

export default function DeleteEquipmentDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  onDeleted 
}: DeleteEquipmentDialogProps) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!password.trim()) {
      setError("กรุณาใส่รหัสผ่านเพื่อยืนยัน");
      return;
    }

    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผลในการลบ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      // Get user profile to verify role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('user_id', session.user.id)
        .single();

      if (!profile || profile.role !== 'super_admin') {
        throw new Error("คุณไม่มีสิทธิ์ในการลบข้อมูล");
      }

      // Call edge function to delete equipment with super admin password verification
      const { data, error } = await supabase.functions.invoke('delete-equipment', {
        body: {
          equipmentId: equipment.id,
          reason: reason,
          superAdminPassword: password,
          userAuthToken: session.access_token
        }
      });

      if (error) {
        throw new Error(error.message || 'เกิดข้อผิดพลาดในการเรียกใช้ฟังก์ชัน');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("ลบข้อมูลครุภัณฑ์สำเร็จ");
      onDeleted();
      onOpenChange(false);
      
      // Reset form
      setPassword("");
      setReason("");
      
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setReason("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ยืนยันการลบครุภัณฑ์
          </DialogTitle>
          <DialogDescription>
            คุณกำลังจะลบครุภัณฑ์: <strong>{equipment.name}</strong> (เลขครุภัณฑ์: {equipment.assetNumber})
            <br />
            <span className="text-destructive font-medium">การกระทำนี้ไม่สามารถยกเลิกได้</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผลในการลบ *</Label>
            <Textarea
              id="reason"
              placeholder="ระบุเหตุผลในการลบครุภัณฑ์นี้..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน Super Admin *</Label>
            <Input
              id="password"
              type="password"
              placeholder="ใส่รหัสผ่าน Super Admin เพื่อยืนยัน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={loading || !password.trim() || !reason.trim()}
          >
            {loading ? (
              "กำลังลบ..."
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                ลบครุภัณฑ์
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}