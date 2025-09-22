import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSuccess: () => void;
}

export const DepartmentDialog = ({ open, onOpenChange, department, onSuccess }: DepartmentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: department?.name || "",
    code: department?.code || "",
    description: department?.description || "",
    active: department?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (department) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update(formData)
          .eq('id', department.id);

        if (error) throw error;

        toast({
          title: "แก้ไขสำเร็จ",
          description: "แก้ไขข้อมูลหน่วยงานเรียบร้อยแล้ว",
        });
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "เพิ่มสำเร็จ",
          description: "เพิ่มหน่วยงานใหม่เรียบร้อยแล้ว",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {department ? "แก้ไขหน่วยงาน" : "เพิ่มหน่วยงานใหม่"}
          </DialogTitle>
          <DialogDescription>
            {department ? "แก้ไขข้อมูลหน่วยงาน" : "กรอกข้อมูลหน่วยงานใหม่"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อหน่วยงาน</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ชื่อหน่วยงาน"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">รหัสหน่วยงาน</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="รหัสหน่วยงาน"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="คำอธิบายเกี่ยวกับหน่วยงาน"
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
              {loading ? "กำลังบันทึก..." : department ? "บันทึกการแก้ไข" : "เพิ่มหน่วยงาน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};