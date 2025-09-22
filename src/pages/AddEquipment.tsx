import { useState } from "react";
import { Save, ArrowLeft, Upload, Computer, Monitor, Printer, Server, Loader2, Shield, HardDrive, Wifi, Tablet, Battery, ScanLine, Archive, Router, Database, Lock, Eye } from "lucide-react";
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
  const [equipmentSubType, setEquipmentSubType] = useState("");
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
      asset_number: equipmentSubType || (formData.get('assetNumber') as string),
      status: formData.get('status') as string || 'available',
      location: getLocationLabel(formData.get('location') as string),
      assigned_to: formData.get('currentUser') as string || null,
      purchase_date: formData.get('purchaseDate') as string || null,
      warranty_end: formData.get('warrantyEnd') as string || null,
      quantity: formData.get('quantity') as string || '1',
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
    { 
      value: "server", 
      label: "เครื่องคอมพิวเตอร์แม่ข่าย", 
      icon: Server,
      code: "7440-001",
      subTypes: [
        { value: "7440-001-0001", label: "เครื่องคอมพิวเตอร์แม่ข่าย แบบที่ 1" },
        { value: "7440-001-0002", label: "เครื่องคอมพิวเตอร์แม่ข่าย แบบที่ 2" }
      ]
    },
    { 
      value: "desktop", 
      label: "เครื่องคอมพิวเตอร์", 
      icon: Computer,
      code: "7440-002",
      subTypes: [
        { value: "7440-002-0001", label: "เครื่องคอมพิวเตอร์ สำหรับสำนักงาน (จอแสดงภาพขนาดไม่น้อยกว่า 19 นิ้ว)" },
        { value: "7440-002-0002", label: "เครื่องคอมพิวเตอร์ สำหรับประมวลผล แบบที่ 1 (จอแสดงภาพขนาดไม่น้อยกว่า 19 นิ้ว)" },
        { value: "7440-002-0003", label: "เครื่องคอมพิวเตอร์ สำหรับประมวลผล แบบที่ 2 (จอแสดงภาพขนาดไม่น้อยกว่า 19 นิ้ว)" },
        { value: "7440-002-0004", label: "เครื่องคอมพิวเตอร์ All in One สำหรับสำนักงาน" },
        { value: "7440-002-0005", label: "เครื่องคอมพิวเตอร์ All in One สำหรับประมวลผล" }
      ]
    },
    { 
      value: "monitor", 
      label: "จอแสดงภาพ", 
      icon: Monitor,
      code: "7440-003",
      subTypes: [
        { value: "7440-003-0001", label: "จอแสดงภาพ ขนาดไม่น้อยกว่า 19 นิ้ว" },
        { value: "7440-003-0002", label: "จอแสดงภาพ ขนาดไม่น้อยกว่า 21.5 นิ้ว" }
      ]
    },
    { 
      value: "laptop", 
      label: "เครื่องคอมพิวเตอร์โน้ตบุ๊ค", 
      icon: Computer,
      code: "7440-004",
      subTypes: [
        { value: "7440-004-0001", label: "เครื่องคอมพิวเตอร์โน้ตบุ๊ค สำหรับสำนักงาน" },
        { value: "7440-004-0002", label: "เครื่องคอมพิวเตอร์โน้ตบุ๊ค สำหรับประมวลผล" }
      ]
    },
    { 
      value: "tablet", 
      label: "คอมพิวเตอร์แท็บเล็ต", 
      icon: Tablet,
      code: "7440-005",
      subTypes: [
        { value: "7440-005-0001", label: "คอมพิวเตอร์แท็บเล็ต แบบที่ 1" },
        { value: "7440-005-0002", label: "คอมพิวเตอร์แท็บเล็ต แบบที่ 2" }
      ]
    },
    { 
      value: "ups", 
      label: "เครื่องสำรองไฟฟ้า", 
      icon: Battery,
      code: "7440-006",
      subTypes: [
        { value: "7440-006-0001", label: "เครื่องสำรองไฟฟ้า ขนาด 800 VA" },
        { value: "7440-006-0002", label: "เครื่องสำรองไฟฟ้า ขนาด 1 kVA" },
        { value: "7440-006-0003", label: "เครื่องสำรองไฟฟ้า ขนาด 2 kVA" },
        { value: "7440-006-0004", label: "เครื่องสำรองไฟฟ้า ขนาด 3 kVA" },
        { value: "7440-006-0005", label: "เครื่องสำรองไฟฟ้า ขนาด 10 kVA" }
      ]
    },
    { 
      value: "scanner", 
      label: "สแกนเนอร์", 
      icon: ScanLine,
      code: "7440-007",
      subTypes: [
        { value: "7440-007-0001", label: "สแกนเนอร์ สำหรับเก็บเอกสารทั่วไป" },
        { value: "7440-007-0002", label: "สแกนเนอร์เก็บเอกสารระดับศูนย์บริการ แบบที่ 1" },
        { value: "7440-007-0003", label: "สแกนเนอร์เก็บเอกสารระดับศูนย์บริการ แบบที่ 2" },
        { value: "7440-007-0004", label: "สแกนเนอร์เก็บเอกสารระดับศูนย์บริการ แบบที่ 3" }
      ]
    },
    { 
      value: "printer", 
      label: "เครื่องพิมพ์", 
      icon: Printer,
      code: "7440-008",
      subTypes: [
        { value: "7440-008-0001", label: "เครื่องพิมพ์ชนิด Dot Matrix Printer แบบแคร่สั้น" },
        { value: "7440-008-0002", label: "เครื่องพิมพ์ชนิด Dot Matrix Printer แบบแคร่ยาว" },
        { value: "7440-008-0003", label: "เครื่องพิมพ์แบบฉีดหมึกพร้อมติดตั้งถังหมึกพิมพ์ (Ink Tank Printer)" },
        { value: "7440-008-0004", label: "เครื่องพิมพ์แบบฉีดหมึก (Ink Printer) สำหรับกระดาษ A3" },
        { value: "7440-008-0005", label: "เครื่องพิมพ์เลเซอร์ หรือ LED ขาวดำ" },
        { value: "7440-008-0006", label: "เครื่องพิมพ์เลเซอร์ หรือ LED ขาวดำ ชนิด Network แบบที่ 1" },
        { value: "7440-008-0007", label: "เครื่องพิมพ์เลเซอร์ หรือ LED ขาวดำ ชนิด Network แบบที่ 2" },
        { value: "7440-008-0008", label: "เครื่องพิมพ์เลเซอร์ หรือ LED สี ชนิด Network แบบที่ 1" },
        { value: "7440-008-0009", label: "เครื่องพิมพ์เลเซอร์ หรือ LED สี ชนิด Network แบบที่ 2" },
        { value: "7440-008-0010", label: "เครื่องพิมพ์เลเซอร์ หรือ LED ขาวดำ ชนิด Network สำหรับกระดาษ A3" },
        { value: "7440-008-0011", label: "เครื่องพิมพ์ Multifunction แบบฉีดหมึกพร้อมติดตั้งถังหมึก (Ink Tank Printer)" },
        { value: "7440-008-0012", label: "เครื่องพิมพ์ Multifunction เลเซอร์ หรือ LED ขาวดำ" },
        { value: "7440-008-0013", label: "เครื่องพิมพ์ Multifunction เลเซอร์ LED หรือ สี" },
        { value: "7440-008-0014", label: "เครื่องพิมพ์วัตถุ 3 มิติ" },
        { value: "7440-008-0015", label: "เครื่องพิมพ์แบบใช้ความร้อน (Thermal Printer)" }
      ]
    },
    { 
      value: "blade_enclosure", 
      label: "ตู้สำหรับการติดตั้งเครื่องแม่ข่ายชนิด Blade (Enclosure/Chassis)", 
      icon: Archive,
      code: "7440-009",
      subTypes: [
        { value: "7440-009-0001", label: "ตู้สำหรับติดตั้งเครื่องแม่ข่ายชนิด Blade Enclosure/Chassis) แบบที่ 1" },
        { value: "7440-009-0002", label: "ตู้สำหรับติดตั้งเครื่องแม่ข่ายชนิด Blade Enclosure/Chassis) แบบที่ 2" }
      ]
    },
    { 
      value: "blade_server", 
      label: "แผงวงจรเครื่องคอมพิวเตอร์แม่ข่าย ชนิด Blade สำหรับตู้ Enclosure/Chassis", 
      icon: Server,
      code: "7440-010",
      subTypes: [
        { value: "7440-010-0001", label: "แผงวงจรเครื่องคอมพิวเตอร์แม่ข่าย ชนิด Blade สำหรับตู้ Enclosure/Chassis แบบที่ 1" },
        { value: "7440-010-0002", label: "แผงวงจรเครื่องคอมพิวเตอร์แม่ข่าย ชนิด Blade สำหรับตู้ Enclosure/Chassis แบบที่ 2" }
      ]
    },
    { 
      value: "external_storage", 
      label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบภายนอก (External Storage)", 
      icon: HardDrive,
      code: "7440-011",
      subTypes: [
        { value: "7440-011-0001", label: "External Harddisk (มีราคาตั้งแต่ 5,000 บาท ขึ้นไป)" }
      ]
    },
    { 
      value: "log_storage", 
      label: "อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย", 
      icon: Database,
      code: "7440-012",
      subTypes: [
        { value: "7440-012-0001", label: "อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย แบบที่ 1" },
        { value: "7440-012-0002", label: "อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย แบบที่ 2" },
        { value: "7440-012-0003", label: "อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย แบบที่ 3" }
      ]
    },
    { 
      value: "firewall", 
      label: "อุปกรณ์ป้องกันเครือข่าย (Next Generation Firewall)", 
      icon: Shield,
      code: "7440-013",
      subTypes: [
        { value: "7440-013-0001", label: "อุปกรณ์ป้องกันเครือข่าย (Next Generation Firewall) แบบที่ 1" },
        { value: "7440-013-0002", label: "อุปกรณ์ป้องกันเครือข่าย (Next Generation Firewall) แบบที่ 2" }
      ]
    },
    { 
      value: "ips", 
      label: "อุปกรณ์ป้องกันและตรวจจับการบุกรุก (Intrusion Prevention System)", 
      icon: Lock,
      code: "7440-014",
      subTypes: [
        { value: "7440-014-0001", label: "อุปกรณ์ป้องกันและตรวจจับการบุกรุก (Intrusion Prevention System) แบบที่ 1" },
        { value: "7440-014-0002", label: "อุปกรณ์ป้องกันและตรวจจับการบุกรุก (Intrusion Prevention System) แบบที่ 2" },
        { value: "7440-014-0003", label: "อุปกรณ์ป้องกันการบุกรุกเว็บไซต์ (Web Application Firewall)" },
        { value: "7440-014-0004", label: "อุปกรณ์ป้องกันการบุกรุกจดหมายอิเล็กทรอนิกส์ (e-Mail Security)" }
      ]
    },
    { 
      value: "equipment_rack", 
      label: "ตู้สำหรับจัดเก็บเครื่องคอมพิวเตอร์และอุปกรณ์", 
      icon: Archive,
      code: "7440-015",
      subTypes: [
        { value: "7440-015-0001", label: "ตู้สำหรับจัดเก็บเครื่องคอมพิวเตอร์และอุปกรณ์ แบบที่ 1 (ขนาด 36U)" },
        { value: "7440-015-0002", label: "ตู้สำหรับจัดเก็บเครื่องคอมพิวเตอร์และอุปกรณ์ แบบที่ 2 (ขนาด 42U)" },
        { value: "7440-015-0003", label: "ตู้สำหรับจัดเก็บเครื่องคอมพิวเตอร์และอุปกรณ์ แบบที่ 3 (ขนาด 42U)" }
      ]
    },
    { 
      value: "signal_distributor", 
      label: "อุปกรณ์กระจายสัญญาณ", 
      icon: Wifi,
      code: "7440-016",
      subTypes: [
        { value: "7440-016-0001", label: "อุปกรณ์กระจายสัญญาณ (L2 Switch) ขนาด 16 ช่อง" },
        { value: "7440-016-0002", label: "อุปกรณ์กระจายสัญญาณ (L2 Switch) ขนาด 24 ช่อง แบบที่ 1" },
        { value: "7440-016-0003", label: "อุปกรณ์กระจายสัญญาณ (L2 Switch) ขนาด 24 ช่อง แบบที่ 2" },
        { value: "7440-016-0004", label: "อุปกรณ์กระจายสัญญาณ (L3 Switch) ขนาด 24 ช่อง" },
        { value: "7440-016-0005", label: "อุปกรณ์กระจายสัญญาณไร้สาย (Access Point) แบบที่ 1" },
        { value: "7440-016-0006", label: "อุปกรณ์กระจายสัญญาณไร้สาย (Access Point) แบบที่ 2" },
        { value: "7440-016-0007", label: "รีโมทพรีเซนไร้สาย" }
      ]
    },
    { 
      value: "router", 
      label: "อุปกรณ์ค้นหาเส้นทางเครือข่าย", 
      icon: Router,
      code: "7440-017",
      subTypes: [
        { value: "7440-017-0001", label: "อุปกรณ์ค้นหาเส้นทางเครือข่าย (Router)" }
      ]
    },
    { 
      value: "load_balancer", 
      label: "อุปกรณ์กระจายการทำงาน", 
      icon: Server,
      code: "7440-018",
      subTypes: [
        { value: "7440-018-0001", label: "อุปกรณ์กระจายการทำงานสำหรับเครือข่าย (Link Load Balancer)" },
        { value: "7440-018-0002", label: "อุปกรณ์กระจายการทำงานสำหรับเครื่องคอมพิวเตอร์แม่ข่าย (Server Load Balancer)" }
      ]
    },
    { 
      value: "card_reader", 
      label: "เครื่องอ่านบัตรแบบอเนกประสงค์", 
      icon: ScanLine,
      code: "7440-019",
      subTypes: [
        { value: "7440-019-0001", label: "เครื่องอ่านบัตรแบบอเนกประสงค์ (Smart Card Reader)" }
      ]
    },
    { 
      value: "software_os", 
      label: "ชุดโปรแกรมระบบปฏิบัติการ", 
      icon: Computer,
      code: "7440-020",
      subTypes: [
        { value: "7440-020-0001", label: "สำหรับเครื่องคอมพิวเตอร์ และคอมพิวเตอร์โน้ตบุ๊ก" },
        { value: "7440-020-0002", label: "สำหรับเครื่องคอมพิวเตอร์แม่ข่าย" },
        { value: "7440-020-0003", label: "ชุดโปรแกรมจัดการสำนักงาน แบบที่ 1" },
        { value: "7440-020-0004", label: "ชุดโปรแกรมจัดการสำนักงาน แบบที่ 2" },
        { value: "7440-020-0005", label: "ชุดโปรแกรมจัดการสำนักงาน แบบที่ 3" },
        { value: "7440-020-0006", label: "ชุดโปรแกรมป้องกันไวรัส สำหรับเครื่องคอมพิวเตอร์ 1 เครื่อง ต่อปี" }
      ]
    },
    { 
      value: "nas", 
      label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ NAS", 
      icon: HardDrive,
      code: "7440-021",
      subTypes: [
        { value: "7440-021-0001", label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ NAS" }
      ]
    },
    { 
      value: "san", 
      label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ SAN", 
      icon: Database,
      code: "7440-022",
      subTypes: [
        { value: "7440-022-0001", label: "อุปกรณ์สำหรับจัดเก็บข้อมูลแบบ SAN" }
      ]
    },
    { 
      value: "cctv", 
      label: "กล้องโทรทัศน์วงจรปิด", 
      icon: Eye,
      code: "7440-023",
      subTypes: [
        { value: "7440-023-0001", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในสำนักงาน" },
        { value: "7440-023-0002", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร" },
        { value: "7440-023-0003", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร สำหรับใช้ในงานรักษาความปลอดภัยทั่วไป" },
        { value: "7440-023-0004", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร แบบที่ 1 สำหรับใช้ในงานรักษาความปลอดภัย วิเคราะห์ภาพ และงานอื่นๆ" },
        { value: "7440-023-0005", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร แบบที่ 2 สำหรับใช้ในงานรักษาความปลอดภัย วิเคราะห์ภาพ และงานอื่นๆ" },
        { value: "7440-023-0006", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร แบบที่ 1 สำหรับใช้ในงานรักษาความปลอดภัยและวิเคราะห์ภาพ" },
        { value: "7440-023-0007", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายในอาคาร แบบที่ 2 สำหรับใช้ในงานรักษาความปลอดภัยและวิเคราะห์ภาพ" },
        { value: "7440-023-0008", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกสำนักงาน" },
        { value: "7440-023-0009", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร สำหรับใช้ในงานรักษาความปลอดภัยทั่วไปและงานอื่นๆ" },
        { value: "7440-023-0010", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร สำหรับใช้ในงานรักษาความปลอดภัยทั่วไป" },
        { value: "7440-023-0011", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร แบบที่ 2 สำหรับใช้ในงานรักษาความปลอดภัยและวิเคราะห์ภาพ" },
        { value: "7440-023-0012", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร แบบที่ 2 สำหรับใช้ในงานรักษาความปลอดภัย วิเคราะห์ภาพ และงานอื่นๆ" },
        { value: "7440-023-0013", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร แบบที่ 1 สำหรับใช้ในงานรักษาความปลอดภัย วิเคราะห์ภาพ และงานอื่นๆ" },
        { value: "7440-023-0014", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบมุมมองคงที่สำหรับติดตั้งภายนอกอาคาร แบบที่ 1 สำหรับใช้ในงานรักษาความปลอดภัยและวิเคราะห์ภาพ" },
        { value: "7440-023-0015", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบปรับมุมมอง แบบที่ 1 สำหรับใช้ในงานรักษาความปลอดภัยทั่วไป" },
        { value: "7440-023-0016", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบปรับมุมมอง สำหรับใช้ในงานรักษาความปลอดภัยทั่วไปและงานอื่นๆ" },
        { value: "7440-023-0017", label: "กล้องโทรทัศน์วงจรปิดชนิดเครือข่าย แบบปรับมุมมอง แบบที่ 2 สำหรับใช้ในงานรักษาความปลอดภัยทั่วไป" }
      ]
    },
    { 
      value: "ip_camera", 
      label: "อุปกรณ์บันทึกภาพผ่านเครือข่าย", 
      icon: Monitor,
      code: "7440-024",
      subTypes: [
        { value: "7440-024-0001", label: "อุปกรณ์บันทึกภาพผ่านเครือข่าย (Network Video Recorder) แบบ 8 ช่อง" },
        { value: "7440-024-0002", label: "อุปกรณ์บันทึกภาพผ่านเครือข่าย (Network Video Recorder) แบบ 16 ช่อง" },
        { value: "7440-024-0003", label: "อุปกรณ์บันทึกภาพผ่านเครือข่าย (Network Video Recorder) แบบ 32ช่อง" }
      ]
    }
  ];

  const getSubTypes = (equipmentType: string) => {
    const type = equipmentTypes.find(t => t.value === equipmentType);
    return type?.subTypes || [];
  };

  const handleEquipmentTypeChange = (value: string) => {
    setEquipmentType(value);
    setEquipmentSubType(""); // Reset sub type when main type changes
  };

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
                <Select value={equipmentType} onValueChange={handleEquipmentTypeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทครุภัณฑ์" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.code} - {type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {equipmentType && (
                <div className="space-y-2">
                  <Label htmlFor="equipmentSubType">รายละเอียดครุภัณฑ์ *</Label>
                  <Select value={equipmentSubType} onValueChange={setEquipmentSubType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรายละเอียดครุภัณฑ์" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-auto">
                      {getSubTypes(equipmentType).map((subType) => (
                        <SelectItem key={subType.value} value={subType.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{subType.value}</span>
                            <span className="text-sm text-muted-foreground">{subType.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                <Label htmlFor="assetNumber">เลขครุภัณฑ์</Label>
                <Input 
                  id="assetNumber" 
                  name="assetNumber"
                  placeholder={equipmentSubType ? `อัตโนมัติ: ${equipmentSubType}` : "เช่น EQ001"}
                  value={equipmentSubType}
                  disabled={!!equipmentSubType}
                />
                <p className="text-sm text-muted-foreground">
                  {equipmentSubType ? "เลขครุภัณฑ์จะถูกกำหนดอัตโนมัติตามประเภทที่เลือก" : "หรือจะถูกกำหนดอัตโนมัติเมื่อเลือกประเภทครุภัณฑ์"}
                </p>
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

              <div className="space-y-2">
                <Label htmlFor="quantity">จำนวน *</Label>
                <Input 
                  id="quantity" 
                  name="quantity"
                  type="number"
                  placeholder="เช่น 1, 5, 10"
                  defaultValue="1"
                  min="1"
                  required
                />
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