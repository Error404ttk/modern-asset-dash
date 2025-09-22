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
      // Verify password by attempting to re-authenticate
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      // Get user profile to verify role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'super_admin') {
        throw new Error("คุณไม่มีสิทธิ์ในการลบข้อมูล");
      }

      // Verify password by signing in again
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password
      });

      if (authError) {
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      // Log the deletion in audit_logs before deleting
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert([
          {
            table_name: 'equipment',
            record_id: equipment.id,
            action: 'DELETE',
            field_name: 'entire_record',
            old_value: JSON.stringify(equipment),
            new_value: null,
            reason: reason,
            changed_by_user_id: user.id,
            user_email: profile.email,
            changed_by: profile.email
          }
        ]);

      if (auditError) {
        console.error('Audit log error:', auditError);
      }

      // Delete the equipment
      const { error: deleteError } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipment.id);

      if (deleteError) {
        throw deleteError;
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
            <Label htmlFor="password">รหัสผ่านยืนยัน *</Label>
            <Input
              id="password"
              type="password"
              placeholder="ใส่รหัสผ่านของคุณเพื่อยืนยัน"
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