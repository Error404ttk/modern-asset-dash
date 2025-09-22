-- Insert sample departments
INSERT INTO public.departments (id, code, name, description, active, created_at, updated_at) VALUES
(gen_random_uuid(), 'IT', 'แผนกเทคโนโลยีสารสนเทศ', 'ดูแลระบบคอมพิวเตอร์และเครือข่าย', true, now(), now()),
(gen_random_uuid(), 'ADMIN', 'แผนกธุรการ', 'งานธุรการและสารบรรณ', true, now(), now()),
(gen_random_uuid(), 'FINANCE', 'แผนกการเงิน', 'งานการเงินและบัญชี', true, now(), now()),
(gen_random_uuid(), 'HR', 'แผนกทรัพยากรบุคคล', 'งานบุคคลและสวัสดิการ', true, now(), now()),
(gen_random_uuid(), 'OPERATION', 'แผนกปฏิบัติการ', 'งานปฏิบัติการหลัก', true, now(), now());

-- Insert equipment types
INSERT INTO public.equipment_types (id, code, name, description, active, created_at, updated_at) VALUES
(gen_random_uuid(), '7440-001', 'เครื่องคอมพิวเตอร์แม่ข่าย', 'Server และ Network Server', true, now(), now()),
(gen_random_uuid(), '7440-002', 'เครื่องคอมพิวเตอร์', 'Desktop และ All-in-One', true, now(), now()),
(gen_random_uuid(), '7440-003', 'จอแสดงภาพ', 'Monitor และ Display', true, now(), now()),
(gen_random_uuid(), '7440-004', 'เครื่องคอมพิวเตอร์โน้ตบุ๊ค', 'Laptop และ Notebook', true, now(), now()),
(gen_random_uuid(), '7440-005', 'คอมพิวเตอร์แท็บเล็ต', 'Tablet และ iPad', true, now(), now()),
(gen_random_uuid(), '7440-006', 'เครื่องสำรองไฟฟ้า', 'UPS และ Power Supply', true, now(), now()),
(gen_random_uuid(), '7440-007', 'สแกนเนอร์', 'Scanner และ Document Scanner', true, now(), now()),
(gen_random_uuid(), '7440-008', 'เครื่องพิมพ์', 'Printer และ Multifunction', true, now(), now()),
(gen_random_uuid(), '7440-009', 'ตู้สำหรับการติดตั้งเครื่องแม่ข่าย', 'Blade Enclosure/Chassis', true, now(), now()),
(gen_random_uuid(), '7440-010', 'แผงวงจรเครื่องคอมพิวเตอร์แม่ข่าย', 'Blade Server', true, now(), now()),
(gen_random_uuid(), '7440-011', 'อุปกรณ์สำหรับจัดเก็บข้อมูลแบบภายนอก', 'External Storage', true, now(), now()),
(gen_random_uuid(), '7440-012', 'อุปกรณ์จัดเก็บ Log File ระบบเครือข่าย', 'Network Log Storage', true, now(), now());

-- Insert organization settings
INSERT INTO public.organization_settings (
  id, code, name, address, phone, email, 
  logo_url, session_timeout, auto_backup, email_notifications,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), 'ORG001', 'ระบบจัดการครุภัณฑ์คอมพิวเตอร์', 
  '123 ถนนเทคโนโลยี แขวงนวัตกรรม เขตดิจิทัล กรุงเทพมหานคร 10400',
  '02-123-4567', 'admin@equipment-system.local',
  null, 30, true, true,
  now(), now()
);