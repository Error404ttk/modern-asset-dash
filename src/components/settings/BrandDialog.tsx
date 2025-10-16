import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface BrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand | null;
  onSuccess: () => void;
}

export const BrandDialog = ({ open, onOpenChange, brand, onSuccess }: BrandDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name || "",
        description: brand.description || "",
        active: brand.active,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        active: true,
      });
    }
  }, [brand]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      active: formData.active,
    };

    try {
      if (!payload.name) {
        toast({
          title: "กรอกข้อมูลไม่ครบ",
          description: "กรุณาระบุชื่อยี่ห้อ",
          variant: "destructive",
        });
        return;
      }

      if (brand) {
        const { error } = await supabase
          .from('equipment_brands')
          .update(payload)
          .eq('id', brand.id);

        if (error) throw error;

        toast({
          title: "บันทึกสำเร็จ",
          description: "แก้ไขยี่ห้อเรียบร้อยแล้ว",
        });
      } else {
        const { error } = await supabase
          .from('equipment_brands')
          .insert(payload);

        if (error) throw error;

        toast({
          title: "บันทึกสำเร็จ",
          description: "เพิ่มยี่ห้อใหม่เรียบร้อยแล้ว",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message ?? "ไม่สามารถบันทึกข้อมูลยี่ห้อได้",
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
          <DialogTitle>{brand ? "แก้ไขยี่ห้อ" : "เพิ่มยี่ห้อใหม่"}</DialogTitle>
          <DialogDescription>
            {brand ? "อัปเดตข้อมูลยี่ห้อ" : "กรอกข้อมูลเพื่อเพิ่มยี่ห้อครุภัณฑ์ใหม่"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">ชื่อยี่ห้อ *</Label>
            <Input
              id="brand-name"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="เช่น Dell, HP, Lenovo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-description">รายละเอียดเพิ่มเติม</Label>
            <Textarea
              id="brand-description"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder="ข้อมูลเกี่ยวกับยี่ห้อ เช่น หมายเหตุหรือรุ่นที่นิยม"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="brand-active">สถานะการใช้งาน</Label>
            <Switch
              id="brand-active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : brand ? "บันทึกการแก้ไข" : "เพิ่มยี่ห้อ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
