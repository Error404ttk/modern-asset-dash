import { Cpu, HardDrive, MemoryStick, Monitor, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TechnicalSpecType {
  id: string;
  name: string;
  icon: LucideIcon;
  tableName: string;
  displayName: string;
  fields: TechnicalSpecField[];
}

export interface TechnicalSpecField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const TECHNICAL_SPEC_TYPES: TechnicalSpecType[] = [
  {
    id: 'cpu',
    name: 'CPU',
    icon: Cpu,
    tableName: 'technical_specs_cpu',
    displayName: 'หน่วยประมวลผลกลาง (CPU)',
    fields: [
      { key: 'name', label: 'ชื่อรุ่น', type: 'text', required: true, placeholder: 'เช่น Intel Core i5-11500' },
      { key: 'brand', label: 'ยี่ห้อ', type: 'text', placeholder: 'เช่น Intel, AMD' },
      { key: 'model', label: 'รุ่น', type: 'text', placeholder: 'เช่น Core i5-11500' },
      { key: 'cores', label: 'จำนวนคอร์', type: 'number', placeholder: 'เช่น 6' },
      { key: 'threads', label: 'จำนวนเธรด', type: 'number', placeholder: 'เช่น 12' },
      { key: 'base_clock_ghz', label: 'ความเร็วพื้นฐาน (GHz)', type: 'number', placeholder: 'เช่น 2.7' },
      { key: 'boost_clock_ghz', label: 'ความเร็วสูงสุด (GHz)', type: 'number', placeholder: 'เช่น 4.6' },
      { key: 'cache_mb', label: 'แคช (MB)', type: 'number', placeholder: 'เช่น 12' },
      { key: 'socket', label: 'ซ็อกเก็ต', type: 'text', placeholder: 'เช่น LGA 1200' },
      { key: 'generation', label: 'เจเนอเรชัน', type: 'text', placeholder: 'เช่น 11th Gen' },
    ]
  },
  {
    id: 'ram',
    name: 'RAM',
    icon: MemoryStick,
    tableName: 'technical_specs_ram',
    displayName: 'หน่วยความจำ (RAM)',
    fields: [
      { key: 'name', label: 'ชื่อรุ่น', type: 'text', required: true, placeholder: 'เช่น DDR4 16GB 3200MHz' },
      { key: 'type', label: 'ประเภท', type: 'select', required: true, options: ['DDR3', 'DDR4', 'DDR5'], placeholder: 'เลือกประเภท' },
      { key: 'capacity_gb', label: 'ความจุ (GB)', type: 'number', required: true, placeholder: 'เช่น 16' },
      { key: 'speed_mhz', label: 'ความเร็ว (MHz)', type: 'number', placeholder: 'เช่น 3200' },
      { key: 'modules', label: 'จำนวนโมดูล', type: 'number', placeholder: 'เช่น 2' },
      { key: 'form_factor', label: 'รูปแบบ', type: 'select', options: ['DIMM', 'SODIMM'], placeholder: 'เลือกฟอร์มแฟคเตอร์' },
    ]
  },
  {
    id: 'harddisk',
    name: 'Harddisk',
    icon: HardDrive,
    tableName: 'technical_specs_harddisk',
    displayName: 'อุปกรณ์เก็บข้อมูล',
    fields: [
      { key: 'name', label: 'ชื่อรุ่น', type: 'text', required: true, placeholder: 'เช่น WD Blue 1TB' },
      { key: 'type', label: 'ประเภท', type: 'select', required: true, options: ['HDD', 'SSD', 'NVMe'], placeholder: 'เลือกประเภท' },
      { key: 'capacity_gb', label: 'ความจุ (GB)', type: 'number', required: true, placeholder: 'เช่น 1000' },
      { key: 'interface', label: 'อินเทอร์เฟซ', type: 'select', options: ['SATA', 'PCIe', 'M.2'], placeholder: 'เลือกอินเทอร์เฟซ' },
      { key: 'form_factor', label: 'รูปแบบ', type: 'select', options: ['2.5"', '3.5"', 'M.2'], placeholder: 'เลือกฟอร์มแฟคเตอร์' },
      { key: 'manufacturer', label: 'ผู้ผลิต', type: 'text', placeholder: 'เช่น Western Digital, Samsung' },
      { key: 'model', label: 'รุ่น', type: 'text', placeholder: 'เช่น WD10EZEX' },
    ]
  },
  {
    id: 'os',
    name: 'Operating System',
    icon: Monitor,
    tableName: 'technical_specs_os',
    displayName: 'ระบบปฏิบัติการ',
    fields: [
      { key: 'name', label: 'ชื่อระบบปฏิบัติการ', type: 'text', required: true, placeholder: 'เช่น Windows 11 Pro' },
      { key: 'version', label: 'เวอร์ชัน', type: 'text', placeholder: 'เช่น 22H2' },
      { key: 'edition', label: 'รุ่น', type: 'text', placeholder: 'เช่น Pro, Home, Enterprise' },
      { key: 'architecture', label: 'สถาปัตยกรรม', type: 'select', options: ['32-bit', '64-bit'], placeholder: 'เลือกสถาปัตยกรรม' },
      { key: 'manufacturer', label: 'ผู้พัฒนา', type: 'text', placeholder: 'เช่น Microsoft, Apple, Canonical' },
      { key: 'license_type', label: 'ประเภทลิขสิทธิ์', type: 'select', options: ['OEM', 'Retail', 'Volume', 'Unactivated', 'Not activated'], placeholder: 'เลือกประเภทลิขสิทธิ์' },
    ]
  },
  {
    id: 'office',
    name: 'Office',
    icon: FileText,
    tableName: 'technical_specs_office',
    displayName: 'ชุดโปรแกรมสำนักงาน',
    fields: [
      { key: 'name', label: 'ชื่อโปรแกรม', type: 'text', required: true, placeholder: 'เช่น Microsoft 365' },
      { key: 'version', label: 'เวอร์ชัน', type: 'text', placeholder: 'เช่น 2021' },
      { key: 'edition', label: 'รุ่น', type: 'text', placeholder: 'เช่น Standard, Professional' },
      { key: 'license_type', label: 'ประเภทลิขสิทธิ์', type: 'select', options: ['Perpetual', 'Subscription', 'Unlicensed', 'Unlicensed Product'], placeholder: 'เลือกประเภทลิขสิทธิ์' },
      { key: 'manufacturer', label: 'ผู้พัฒนา', type: 'text', placeholder: 'เช่น Microsoft, LibreOffice' },
    ]
  }
];

export type TechnicalSpecRecord = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
} & Record<string, any>;

export const getTechnicalSpecType = (id: string): TechnicalSpecType | undefined => {
  return TECHNICAL_SPEC_TYPES.find(type => type.id === id);
};

export const getTechnicalSpecTypeByTable = (tableName: string): TechnicalSpecType | undefined => {
  return TECHNICAL_SPEC_TYPES.find(type => type.tableName === tableName);
};
