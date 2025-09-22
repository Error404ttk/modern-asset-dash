import { useState } from "react";
import { Save, ArrowLeft, Upload, Computer, Monitor, Printer, Server, Loader2, Shield, HardDrive, Wifi, Tablet, Battery, ScanLine, Archive, Router, Database, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AddEquipment() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [equipmentType, setEquipmentType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    // Build specs object for computer types
    const specs: any = {};
    if (isComputerType) {
      specs.cpu = formData.get('cpu') || null;
      specs.ram = formData.get('ram') || null;
      specs.storage = formData.get('storage') || null;
      specs.gpu = formData.get('gpu') || null;
      specs.os = formData.get('os') || null;
      specs.productKey = formData.get('productKey') || null;
      specs.ipAddress = formData.get('ipAddress') || null;
      specs.macAddress = formData.get('macAddress') || null;
      specs.hostname = formData.get('hostname') || null;
    }

    const equipmentData = {
      name: formData.get('equipmentName') as string,
      type: getEquipmentTypeLabel(equipmentType),
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      serial_number: formData.get('serialNumber') as string,
      asset_number: formData.get('assetNumber') as string,
      status: formData.get('status') as string || 'available',
      location: getLocationLabel(formData.get('location') as string),
      assigned_to: formData.get('currentUser') as string || null,
      purchase_date: formData.get('purchaseDate') as string || null,
      warranty_end: formData.get('warrantyEnd') as string || null,
      specs: Object.keys(specs).length > 0 ? specs : null
    };

    try {
      const { error } = await (supabase as any)
        .from('equipment')
        .insert([equipmentData]);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลครุภัณฑ์ได้ถูกบันทึกเรียบร้อยแล้ว",
      });

      // Navigate back to equipment list
      navigate('/equipment');
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEquipmentTypeLabel = (value: string) => {
    const type = equipmentTypes.find(t => t.value === value);
    return type ? type.label : value;
  };

  const getLocationLabel = (value: string) => {
    const locations = {
      'it-101': 'ห้อง IT-101',
      'admin-201': 'ห้องธุรการ 201',
      'meeting-301': 'ห้องประชุม 301',
      'director': 'ห้องผู้อำนวยการ',
      'storage': 'ห้องจัดเก็บ'
    };
    return locations[value as keyof typeof locations] || value;
  };

  const equipmentTypes = [
    { value: "server", label: "เครื่องคอมพิวเตอร์แม่ข่าย", icon: Server },
    { value: "desktop", label: "เครื่องคอมพิวเตอร์", icon: Computer },
    { value: "monitor", label: "จอแสดงภาพ", icon: Monitor },
    { value: "laptop", label: "เครื่องคอมพิวเตอร์โน้ตบุ๊ค", icon: Computer },
    { value: "tablet", label: "คอมพิวเตอร์แท็บเล็ต", icon: Tablet },
    { value: "ups", label: "เครื่องสำรองไฟฟ้า", icon: Battery },
    { value: "scanner", label: "สแกนเนอร์", icon: ScanLine },
    { value: "printer", label: "เครื่องพิมพ์", icon: Printer },
    { value: "blade_enclosure", label: "ตู้สำหรับการติดตั้งเครื่องแม่ข่ายชนิด Blade (Enclosure/Chassis)", icon: Archive },
    { value: "blade_server", label: "แผงวงจรเครื่องคอมพิวเตอร์แม่ข่าย ชนิด Blade สำหรับตู้ Enclosure/Chassis", icon: Server },
    { value: "external_storage", label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบภายนอก (External Storage)", icon: HardDrive },
    { value: "log_storage", label: "อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย", icon: Database },
    { value: "firewall", label: "อุปกรณ์ป้องกันเครือข่าย (Next Generation Firewall)", icon: Shield },
    { value: "ips", label: "อุปกรณ์ป้องกันและตรวจจับการบุกรุก (Intrusion Prevention System)", icon: Lock },
    { value: "equipment_rack", label: "ตู้สำหรับจัดเก็บเครื่องคอมพิวเตอร์และอุปกรณ์", icon: Archive },
    { value: "signal_distributor", label: "อุปกรณ์กระจายสัญญาณ", icon: Wifi },
    { value: "router", label: "อุปกรณ์ค้นหาเส้นทางเครือข่าย", icon: Router },
    { value: "load_balancer", label: "อุปกรณ์กระจายการทำงาน", icon: Server },
    { value: "card_reader", label: "เครื่องอ่านบัตรแบบอเนกประสงค์", icon: ScanLine },
    { value: "software_os", label: "ชุดโปรแกรมระบบปฏิบัติการ", icon: Computer },
    { value: "nas", label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ NAS", icon: HardDrive },
    { value: "san", label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ SAN", icon: Database },
    { value: "ip_camera", label: "อุปกรณ์บันทึกภาพผ่านเครือข่าย", icon: Monitor },
  ];

  const isComputerType = equipmentType === "desktop" || equipmentType === "laptop" || equipmentType === "server" || equipmentType === "tablet" || equipmentType === "blade_server";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/equipment">
            <Button variant="ghost" size="sm" className="hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">เพิ่มครุภัณฑ์ใหม่</h1>
            <p className="text-muted-foreground">บันทึกข้อมูลครุภัณฑ์คอมพิวเตอร์</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Computer className="h-5 w-5 text-primary" />
              <span>ข้อมูลทั่วไป</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="equipmentName">ชื่อครุภัณฑ์ *</Label>
                <Input 
                  id="equipmentName" 
                  name="equipmentName"
                  placeholder="เช่น Dell OptiPlex 7090"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="equipmentType">ประเภทครุภัณฑ์ *</Label>
                <Select value={equipmentType} onValueChange={setEquipmentType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทครุภัณฑ์" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">ยี่ห้อ *</Label>
                <Input 
                  id="brand" 
                  name="brand"
                  placeholder="เช่น Dell, HP, Lenovo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">รุ่น/โมเดล *</Label>
                <Input 
                  id="model" 
                  name="model"
                  placeholder="เช่น OptiPlex 7090, LaserJet Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input 
                  id="serialNumber" 
                  name="serialNumber"
                  placeholder="เช่น DELL7090001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetNumber">เลขครุภัณฑ์ *</Label>
                <Input 
                  id="assetNumber" 
                  name="assetNumber"
                  placeholder="เช่น EQ001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">วันที่ได้มา *</Label>
                <Input 
                  id="purchaseDate" 
                  name="purchaseDate"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warrantyEnd">วันที่หมดประกัน</Label>
                <Input 
                  id="warrantyEnd" 
                  name="warrantyEnd"
                  type="date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">สถานะ *</Label>
                <Select name="status" defaultValue="available" required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">พร้อมใช้งาน</SelectItem>
                    <SelectItem value="borrowed">ถูกยืม</SelectItem>
                    <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                    <SelectItem value="damaged">ชำรุด</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipmentImage">รูปภาพครุภัณฑ์</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <div className="mt-4">
                  <Label 
                    htmlFor="equipmentImage" 
                    className="cursor-pointer text-primary hover:text-primary/80"
                  >
                    คลิกเพื่ือเลือกไฟล์รูปภาพ
                  </Label>
                  <Input 
                    id="equipmentImage" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  รองรับไฟล์ JPG, PNG, GIF ขนาดไม่เกิน 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Computer Specifications */}
        {isComputerType && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Computer className="h-5 w-5 text-primary" />
                <span>ข้อมูลเฉพาะคอมพิวเตอร์</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cpu">CPU (ประเภท, รุ่น)</Label>
                  <Input 
                    id="cpu" 
                    name="cpu"
                    placeholder="เช่น Intel Core i5-11500, AMD Ryzen 5 5500U"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ram">RAM (ขนาด, ประเภท)</Label>
                  <Input 
                    id="ram" 
                    name="ram"
                    placeholder="เช่น 8GB DDR4, 16GB DDR4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storage">Storage (ประเภท, ขนาด)</Label>
                  <Input 
                    id="storage" 
                    name="storage"
                    placeholder="เช่น 256GB SSD, 1TB HDD"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpu">Graphic Card (GPU)</Label>
                  <Input 
                    id="gpu" 
                    name="gpu"
                    placeholder="เช่น Intel UHD Graphics, NVIDIA GTX 1650"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="os">Operating System</Label>
                  <Select name="os">
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก OS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows11">Windows 11</SelectItem>
                      <SelectItem value="windows10">Windows 10</SelectItem>
                      <SelectItem value="ubuntu">Ubuntu</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                      <SelectItem value="other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productKey">Product Key</Label>
                  <Input 
                    id="productKey" 
                    name="productKey"
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input 
                    id="ipAddress" 
                    name="ipAddress"
                    placeholder="เช่น 192.168.1.100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="macAddress">MAC Address</Label>
                  <Input 
                    id="macAddress" 
                    name="macAddress"
                    placeholder="เช่น 00:11:22:33:44:55"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hostname">ชื่อ Hostname</Label>
                  <Input 
                    id="hostname" 
                    name="hostname"
                    placeholder="เช่น PC-OFFICE-01"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Information */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span>ข้อมูลการใช้งาน/จัดเก็บ</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department">หน่วยงานที่รับผิดชอบ *</Label>
                <Select name="department" required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหน่วยงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">กองเทคโนโลยีสารสนเทศ</SelectItem>
                    <SelectItem value="admin">กองธุรการ</SelectItem>
                    <SelectItem value="finance">กองคลัง</SelectItem>
                    <SelectItem value="hr">กองบุคคล</SelectItem>
                    <SelectItem value="planning">กองแผนงาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">สถานที่ติดตั้ง/จัดเก็บ *</Label>
                <Select name="location" required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it-101">ห้อง IT-101</SelectItem>
                    <SelectItem value="admin-201">ห้องธุรการ 201</SelectItem>
                    <SelectItem value="meeting-301">ห้องประชุม 301</SelectItem>
                    <SelectItem value="director">ห้องผู้อำนวยการ</SelectItem>
                    <SelectItem value="storage">ห้องจัดเก็บ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="currentUser">ผู้ใช้งานปัจจุบัน</Label>
                <Input 
                  id="currentUser" 
                  name="currentUser"
                  placeholder="เช่น นายสมชาย ใจดี"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea 
                  id="notes" 
                  name="notes"
                  placeholder="ข้อมูลเพิ่มเติมหรือหมายเหตุพิเศษ..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link to="/equipment">
            <Button variant="outline" type="button">
              ยกเลิก
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-gradient-primary hover:opacity-90 shadow-soft"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </Button>
        </div>
      </form>
    </div>
  );
}