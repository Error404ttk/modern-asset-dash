import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TechnicalSpecType, TechnicalSpecField, TechnicalSpecRecord } from "@/data/technicalSpecs";

interface TechnicalSpecsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specType: TechnicalSpecType;
  spec?: TechnicalSpecRecord | null;
  onSuccess: () => void;
}

export const TechnicalSpecsDialog = ({
  open,
  onOpenChange,
  specType,
  spec,
  onSuccess
}: TechnicalSpecsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Initialize form data
  useEffect(() => {
    if (spec) {
      setFormData({ ...spec });
    } else {
      const initialData: Record<string, any> = { active: true };
      specType.fields.forEach(field => {
        if (field.type === 'number') {
          initialData[field.key] = '';
        } else {
          initialData[field.key] = '';
        }
      });
      setFormData(initialData);
    }
  }, [spec, specType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      const missingFields = specType.fields.filter(field => field.required && !formData[field.key]?.toString().trim());

      if (missingFields.length > 0) {
        toast({
          title: "กรอกข้อมูลไม่ครบ",
          description: `กรุณากรอกข้อมูลในฟิลด์: ${missingFields.map(f => f.label).join(', ')}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Convert numeric fields
      const submitData = { ...formData };
      specType.fields.forEach(field => {
        if (field.type === 'number' && submitData[field.key] !== '') {
          submitData[field.key] = parseFloat(submitData[field.key]) || null;
        }
      });

      if (spec) {
        // Update existing spec
        const { error } = await supabase
          .from(specType.tableName)
          .update(submitData)
          .eq('id', spec.id);

        if (error) throw error;

        toast({
          title: "แก้ไขสำเร็จ",
          description: `แก้ไขข้อมูล${specType.displayName}เรียบร้อยแล้ว`,
        });
      } else {
        // Create new spec
        const { error } = await supabase
          .from(specType.tableName)
          .insert(submitData);

        if (error) throw error;

        toast({
          title: "เพิ่มสำเร็จ",
          description: `เพิ่ม${specType.displayName}ใหม่เรียบร้อยแล้ว`,
        });
      }

      onSuccess();
      onOpenChange(false);
      // Reset form when dialog closes
      if (!spec) {
        const resetData: Record<string, any> = { active: true };
        specType.fields.forEach(field => {
          resetData[field.key] = field.type === 'number' ? '' : '';
        });
        setFormData(resetData);
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

  const handleFieldChange = (field: TechnicalSpecField, value: string) => {
    setFormData(prev => ({ ...prev, [field.key]: value }));
  };

  const renderField = (field: TechnicalSpecField) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.key}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min="0"
            step="any"
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(newValue) => handleFieldChange(field, newValue)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <specType.icon className="h-5 w-5" />
            {spec ? `แก้ไข${specType.displayName}` : `เพิ่ม${specType.displayName}ใหม่`}
          </DialogTitle>
          <DialogDescription>
            {spec ? `แก้ไขข้อมูล${specType.displayName}` : `กรอกข้อมูล${specType.displayName}ใหม่`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {specType.fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Label htmlFor="active">สถานะการใช้งาน</Label>
            <Switch
              id="active"
              checked={formData.active || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : spec ? "บันทึกการแก้ไข" : `เพิ่ม${specType.displayName}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
