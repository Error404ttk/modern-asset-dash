import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EquipmentTypeSummary {
  id: string;
  name: string;
}

export interface EquipmentTypeDetail {
  id: string;
  equipment_type_id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

interface EquipmentTypeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentType: EquipmentTypeSummary | null;
  detail?: EquipmentTypeDetail | null;
  onSuccess: () => void;
}

const DETAIL_CODE_PATTERN = /^\d{4}-\d{3}-\d{4}$/;

export const EquipmentTypeDetailDialog = ({
  open,
  onOpenChange,
  equipmentType,
  detail,
  onSuccess,
}: EquipmentTypeDetailDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    active: true,
  });

  useEffect(() => {
    if (detail) {
      setFormData({
        name: detail.name,
        code: detail.code,
        description: detail.description ?? "",
        active: detail.active,
      });
    } else {
      setFormData({ name: "", code: "", description: "", active: true });
    }
  }, [detail, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!equipmentType) {
      toast({
        title: "ไม่พบข้อมูลประเภท",
        description: "กรุณาเลือกประเภทครุภัณฑ์ก่อน",
        variant: "destructive",
      });
      return;
    }

    const name = formData.name.trim();
    const code = formData.code.trim().toUpperCase();
    const description = formData.description.trim();

    if (!name || !code) {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณาระบุชื่อและรหัสรายละเอียดครุภัณฑ์",
        variant: "destructive",
      });
      return;
    }

    if (!DETAIL_CODE_PATTERN.test(code)) {
      toast({
        title: "รูปแบบรหัสไม่ถูกต้อง",
        description: "รูปแบบที่ถูกต้องคือ ####-###-#### เช่น 7440-001-0001",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        equipment_type_id: equipmentType.id,
        name,
        code,
        description: description || null,
        active: formData.active,
      };

      if (detail) {
        const { error } = await supabase
          .from('equipment_type_details')
          .update({
            name,
            code,
            description: description || null,
            active: formData.active,
          })
          .eq('id', detail.id);

        if (error) throw error;

        toast({
          title: "บันทึกสำเร็จ",
          description: "แก้ไขรายละเอียดครุภัณฑ์เรียบร้อยแล้ว",
        });
      } else {
        const { error } = await supabase
          .from('equipment_type_details')
          .insert(payload);

        if (error) throw error;

        toast({
          title: "เพิ่มสำเร็จ",
          description: "เพิ่มรายละเอียดครุภัณฑ์ใหม่เรียบร้อยแล้ว",
        });
      }

      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", code: "", description: "", active: true });
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

  const dialogTitle = detail ? "แก้ไขรายละเอียดครุภัณฑ์" : "เพิ่มรายละเอียดครุภัณฑ์ใหม่";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {equipmentType
              ? `จัดการรายละเอียดสำหรับประเภท: ${equipmentType.name}`
              : "เลือกประเภทครุภัณฑ์เพื่อเพิ่มรายละเอียด"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="detail-name">ชื่อรายละเอียดครุภัณฑ์</Label>
            <Input
              id="detail-name"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="เช่น เครื่องคอมพิวเตอร์แม่ข่าย แบบที่ 1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-code">รหัสรายละเอียด</Label>
            <Input
              id="detail-code"
              value={formData.code}
              onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase() })}
              placeholder="เช่น 7440-001-0001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-description">คำอธิบาย</Label>
            <Textarea
              id="detail-description"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder="รายละเอียดเพิ่มเติมของครุภัณฑ์ (ถ้ามี)"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="detail-active">สถานะการใช้งาน</Label>
            <Switch
              id="detail-active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !equipmentType}>
              {loading ? "กำลังบันทึก..." : detail ? "บันทึกการแก้ไข" : "เพิ่มรายละเอียด"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
