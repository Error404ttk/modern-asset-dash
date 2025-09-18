import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetNumber: string;
  status: string;
  location: string;
  user: string;
  purchaseDate: string;
  warrantyEnd: string;
  specs: {
    [key: string]: string;
  };
}

interface EquipmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
  onSave: (equipment: Equipment) => void;
}

export default function EquipmentEditDialog({ 
  open, 
  onOpenChange, 
  equipment, 
  onSave 
}: EquipmentEditDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Equipment>(equipment);

  useEffect(() => {
    setFormData(equipment);
  }, [equipment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    toast({
      title: "บันทึกสำเร็จ",
      description: "ข้อมูลครุภัณฑ์ได้รับการอัปเดตแล้ว",
    });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecChange = (specKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [specKey]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลครุภัณฑ์</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลครุภัณฑ์ {equipment.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ข้อมูลหลัก */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">ชื่อครุภัณฑ์</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">ประเภท</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desktop PC">Desktop PC</SelectItem>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Printer">Printer</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Server">Server</SelectItem>
                      <SelectItem value="Network Device">Network Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand">ยี่ห้อ</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="model">รุ่น</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                  <Input
                    id="assetNumber"
                    value={formData.assetNumber}
                    onChange={(e) => handleInputChange('assetNumber', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลการใช้งาน */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลการใช้งาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">สถานะ</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="working">ใช้งานปกติ</SelectItem>
                      <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                      <SelectItem value="broken">ชำรุด</SelectItem>
                      <SelectItem value="retired">จำหน่ายแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">สถานที่</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="user">ผู้ใช้งาน</Label>
                  <Input
                    id="user"
                    value={formData.user}
                    onChange={(e) => handleInputChange('user', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">วันที่ได้มา</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyEnd">หมดประกัน</Label>
                  <Input
                    id="warrantyEnd"
                    type="date"
                    value={formData.warrantyEnd}
                    onChange={(e) => handleInputChange('warrantyEnd', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ข้อมูลเทคนิค */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลเทคนิค</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData.specs).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key} className="capitalize">
                      {key === 'cpu' ? 'CPU' : 
                       key === 'ram' ? 'RAM' :
                       key === 'storage' ? 'Storage' :
                       key === 'size' ? 'ขนาด' :
                       key === 'resolution' ? 'ความละเอียด' :
                       key === 'panel' ? 'Panel' :
                       key === 'type' ? 'ประเภท' :
                       key === 'speed' ? 'ความเร็ว' :
                       key}
                    </Label>
                    <Input
                      id={key}
                      value={value}
                      onChange={(e) => handleSpecChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}