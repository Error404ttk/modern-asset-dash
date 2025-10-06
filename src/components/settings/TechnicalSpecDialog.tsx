import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TECHNICAL_SPEC_TYPES, TechnicalSpecType, TechnicalSpecField } from "@/data/technicalSpecs";
import { Loader2, Save, Cpu, HardDrive, MemoryStick, Monitor, FileText } from "lucide-react";

interface TechnicalSpecRecord {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface TechnicalSpecDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specType: TechnicalSpecType;
  specRecord?: TechnicalSpecRecord | null;
  onSuccess: () => void;
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Cpu': return Cpu;
    case 'HardDrive': return HardDrive;
    case 'MemoryStick': return MemoryStick;
    case 'Monitor': return Monitor;
    case 'FileText': return FileText;
    default: return Cpu;
  }
};

export const TechnicalSpecDialog = ({
  open,
  onOpenChange,
  specType,
  specRecord,
  onSuccess
}: TechnicalSpecDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});

  // Early return if specType is not provided
  if (!specType) {
    console.error('TechnicalSpecDialog: specType is required');
    return null;
  }

  const IconComponent = getIcon(specType.icon?.name || 'Cpu');

  useEffect(() => {
    if (specRecord) {
      const { id, created_at, updated_at, active, ...specData } = specRecord;
      setFormData(specData);
    } else {
      // Initialize with empty values
      const initialData: Record<string, string | number | boolean> = {};
      specType?.fields?.forEach(field => {
        if (field.type === 'number') {
          initialData[field.key] = 0;
        } else if (field.type === 'text') {
          initialData[field.key] = '';
        } else {
          initialData[field.key] = '';
        }
      });
      setFormData(initialData);
    }
  }, [specRecord, specType]);

  const handleSave = async () => {
    if (!specType) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลประเภทเทคนิค",
        variant: "destructive",
      });
      return;
    }

    const nameValue = String(formData.name || '');
    if (!nameValue || nameValue.trim() === '') {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อข้อมูล",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        name: nameValue,
        active: true,
      };

      if (specRecord?.id) {
        // Update existing record
        const { error } = await (supabase as any)
          .from(specType.tableName)
          .update(dataToSave)
          .eq('id', specRecord.id);

        if (error) throw error;

        toast({
          title: "อัปเดตสำเร็จ",
          description: `อัปเดตข้อมูล ${specType?.displayName || 'เทคนิค'} เรียบร้อยแล้ว`,
        });
      } else {
        // Create new record
        const { error } = await (supabase as any)
          .from(specType.tableName)
          .insert(dataToSave);

        if (error) throw error;

        toast({
          title: "เพิ่มสำเร็จ",
          description: `เพิ่มข้อมูล ${specType?.displayName || 'เทคนิค'} เรียบร้อยแล้ว`,
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

  const handleFieldChange = (fieldKey: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const renderField = (field: TechnicalSpecField) => {
    const value = formData[field.key];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={Number(value || 0)}
            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={String(value || '')}
            onValueChange={(newValue) => handleFieldChange(field.key, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
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
          <DialogTitle className="flex items-center">
            <IconComponent className="mr-2 h-5 w-5" />
            {specRecord ? 'แก้ไข' : 'เพิ่ม'} {specType?.displayName || 'ข้อมูลเทคนิค'}
          </DialogTitle>
          <DialogDescription>
            {specRecord ? 'แก้ไขข้อมูลสเปคเทคนิค' : 'เพิ่มข้อมูลสเปคเทคนิคใหม่'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อข้อมูล *</Label>
                <Input
                  id="name"
                  value={String(formData.name || '')}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder={`กรุณากรอกชื่อ ${specType.displayName.toLowerCase()}`}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลสเปคเทคนิค</CardTitle>
              <CardDescription>
                กรอกข้อมูลสเปคเทคนิคตามฟิลด์ที่กำหนด
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {specType.fields
                .filter(field => field.key !== 'name') // Exclude name field as it's in basic info
                .map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {specRecord ? 'อัปเดต' : 'เพิ่มข้อมูล'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
