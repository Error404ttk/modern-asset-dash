import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Vendor {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
}

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSuccess: () => void;
}

export const VendorDialog = ({ open, onOpenChange, vendor, onSuccess }: VendorDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    active: true,
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        address: vendor.address || "",
        phone: vendor.phone || "",
        active: vendor.active,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        phone: "",
        active: true,
      });
    }
  }, [vendor]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      phone: formData.phone.trim() || null,
      active: formData.active,
    };

    try {
      if (!payload.name) {
        toast({
          title: "กรอกข้อมูลไม่ครบ",
          description: "กรุณาระบุชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค",
          variant: "destructive",
        });
        return;
      }

      if (vendor) {
        const { error } = await supabase
          .from('vendors')
          .update(payload)
          .eq('id', vendor.id);

        if (error) throw error;

        toast({
          title: "บันทึกสำเร็จ",
          description: "แก้ไขข้อมูลผู้ขายเรียบร้อยแล้ว",
        });
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert(payload);

        if (error) throw error;

        toast({
          title: "บันทึกสำเร็จ",
          description: "เพิ่มผู้ขายใหม่เรียบร้อยแล้ว",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vendor ? "แก้ไขข้อมูลผู้ขาย" : "เพิ่มผู้ขาย/ผู้รับจ้าง/ผู้บริจาค"}</DialogTitle>
          <DialogDescription>
            {vendor ? "อัปเดตข้อมูลผู้ขาย/ผู้รับจ้าง/ผู้บริจาค" : "กรอกข้อมูลสำหรับผู้ขาย/ผู้รับจ้าง/ผู้บริจาคใหม่"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">ชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค *</Label>
            <Input
              id="vendor-name"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="กรอกชื่อผู้ขาย/ผู้รับจ้าง/ผู้บริจาค"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-phone">โทรศัพท์</Label>
            <Input
              id="vendor-phone"
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              placeholder="หมายเลขโทรศัพท์"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-address">ที่อยู่</Label>
            <Textarea
              id="vendor-address"
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              placeholder="ที่อยู่ของผู้ขาย/ผู้รับจ้าง/ผู้บริจาค"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="vendor-active">สถานะการใช้งาน</Label>
            <Switch
              id="vendor-active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : vendor ? "บันทึกการแก้ไข" : "เพิ่มผู้ขาย"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
