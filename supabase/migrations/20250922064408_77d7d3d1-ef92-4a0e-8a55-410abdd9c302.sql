-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_types table
CREATE TABLE public.equipment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_settings table
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  email_notifications BOOLEAN DEFAULT true,
  auto_backup BOOLEAN DEFAULT true,
  session_timeout INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Everyone can view departments"
ON public.departments
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage departments"
ON public.departments
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create policies for equipment_types  
CREATE POLICY "Everyone can view equipment types"
ON public.equipment_types
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage equipment types"
ON public.equipment_types
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create policies for organization_settings
CREATE POLICY "Everyone can view organization settings"
ON public.organization_settings
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage organization settings"
ON public.organization_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_types_updated_at
BEFORE UPDATE ON public.equipment_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.departments (name, code, description) VALUES
('กองคลัง', 'FIN', 'หน่วยงานด้านการเงินและบัญชี'),
('กองช่าง', 'ENG', 'หน่วยงานด้านวิศวกรรมและซ่อมบำรุง'),
('กองแผน', 'PLN', 'หน่วยงานด้านการวางแผนและนโยบาย'),
('ฝ่ายเทคโนโลยีสารสนเทศ', 'IT', 'หน่วยงานด้านเทคโนโลยีสารสนเทศ');

INSERT INTO public.equipment_types (name, code, description) VALUES
('คอมพิวเตอร์ตั้งโต๊ะ', 'DESKTOP', 'เครื่องคอมพิวเตอร์ประจำโต๊ะ'),
('คอมพิวเตอร์แบบพกพา', 'LAPTOP', 'เครื่องคอมพิวเตอร์โน้ตบุ๊ก'),
('จอภาพ', 'MONITOR', 'จอแสดงผลคอมพิวเตอร์'),
('เครื่องพิมพ์', 'PRINTER', 'เครื่องพิมพ์เอกสาร'),
('เซิร์ฟเวอร์', 'SERVER', 'เครื่องแม่ข่าย');

INSERT INTO public.organization_settings (name, code, address, phone, email) VALUES
('หน่วยงานราชการ', 'GOV001', '123 ถนนราชดำเนิน เขตพระนคร กรุงเทพมหานคร 10200', '02-123-4567', 'contact@department.go.th');