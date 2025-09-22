import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EquipmentType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

interface EquipmentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentType?: EquipmentType | null;
  onSuccess: () => void;
}

export const EquipmentTypeDialog = ({ open, onOpenChange, equipmentType, onSuccess }: EquipmentTypeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    active: true,
  });

  // Update form data when equipmentType changes
  useEffect(() => {
    if (equipmentType) {
      setFormData({
        name: equipmentType.name,
        code: equipmentType.code,
        description: equipmentType.description || "",
        active: equipmentType.active,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        active: true,
      });
    }
  }, [equipmentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (equipmentType) {
        // Update existing equipment type
        const { error } = await supabase
          .from('equipment_types')
          .update(formData)
          .eq('id', equipmentType.id);

        if (error) throw error;

        toast({
          title: "แก้ไขสำเร็จ",
          description: "แก้ไขข้อมูลประเภทครุภัณฑ์เรียบร้อยแล้ว",
        });
      } else {
        // Create new equipment type
        const { error } = await supabase
          .from('equipment_types')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "เพิ่มสำเร็จ",
          description: "เพิ่มประเภทครุภัณฑ์ใหม่เรียบร้อยแล้ว",
        });
      }

      onSuccess();
      onOpenChange(false);
      // Reset form when dialog closes
      if (!equipmentType) {
        setFormData({ name: "", code: "", description: "", active: true });
      }
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
          <DialogTitle>
            {equipmentType ? "แก้ไขประเภทครุภัณฑ์" : "เพิ่มประเภทครุภัณฑ์ใหม่"}
          </DialogTitle>
          <DialogDescription>
            {equipmentType ? "แก้ไขข้อมูลประเภทครุภัณฑ์" : "กรอกข้อมูลประเภทครุภัณฑ์ใหม่"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อประเภท</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ชื่อประเภทครุภัณฑ์"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">รหัสประเภท</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="รหัสประเภท"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="คำอธิบายเกี่ยวกับประเภทครุภัณฑ์"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">สถานะการใช้งาน</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : equipmentType ? "บันทึกการแก้ไข" : "เพิ่มประเภท"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};