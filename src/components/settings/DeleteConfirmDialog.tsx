import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName: string;
  onConfirm: (reason: string, password: string) => Promise<void>;
}

export const DeleteConfirmDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  itemName, 
  onConfirm 
}: DeleteConfirmDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast({
        title: "กรุณาระบุเหตุผล",
        description: "กรุณาระบุเหตุผลในการลบ",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "กรุณาใส่รหัสผ่าน",
        description: "กรุณาใส่รหัสผ่าน Super Admin เพื่อยืนยันการลบ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason, password);
      onOpenChange(false);
      setReason("");
      setPassword("");
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{description}</p>
              <p className="font-medium">รายการที่จะลบ: <span className="text-foreground">{itemName}</span></p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">เหตุผลในการลบ</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลในการลบ..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน Super Admin</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ใส่รหัสผ่าน Super Admin เพื่อยืนยัน"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "กำลังลบ..." : "ยืนยันการลบ"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};