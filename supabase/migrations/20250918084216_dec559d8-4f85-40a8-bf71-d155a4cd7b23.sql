-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  asset_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'working',
  location TEXT,
  current_user TEXT,
  purchase_date DATE,
  warranty_end DATE,
  specs JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment access (public access for now)
CREATE POLICY "Equipment is viewable by everyone" 
ON public.equipment 
FOR SELECT 
USING (true);

CREATE POLICY "Equipment can be inserted by everyone" 
ON public.equipment 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Equipment can be updated by everyone" 
ON public.equipment 
FOR UPDATE 
USING (true);

CREATE POLICY "Equipment can be deleted by everyone" 
ON public.equipment 
FOR DELETE 
USING (true);

-- Create equipment history table for tracking changes
CREATE TABLE public.equipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'borrowed', 'returned'
  changes JSONB,
  performed_by TEXT,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for equipment history
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment history is viewable by everyone" 
ON public.equipment_history 
FOR SELECT 
USING (true);

CREATE POLICY "Equipment history can be inserted by everyone" 
ON public.equipment_history 
FOR INSERT 
WITH CHECK (true);

-- Create borrow records table
CREATE TABLE public.borrow_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  borrower_name TEXT NOT NULL,
  borrower_contact TEXT,
  borrow_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return_date DATE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'borrowed', -- 'borrowed', 'returned', 'overdue'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for borrow records
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Borrow records are viewable by everyone" 
ON public.borrow_records 
FOR SELECT 
USING (true);

CREATE POLICY "Borrow records can be inserted by everyone" 
ON public.borrow_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Borrow records can be updated by everyone" 
ON public.borrow_records 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.equipment (name, type, brand, model, serial_number, asset_number, status, location, current_user, purchase_date, warranty_end, specs) VALUES
('Dell OptiPlex 7090', 'Desktop PC', 'Dell', 'OptiPlex 7090', 'DL7090001', 'EQ001', 'working', 'ห้องไอที ชั้น 2', 'สมชาย จันทร์ดี', '2023-01-15', '2026-01-15', '{"cpu": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD"}'),
('HP LaserJet Pro M404n', 'Printer', 'HP', 'LaserJet Pro M404n', 'HP404001', 'EQ002', 'working', 'ห้องบัญชี ชั้น 1', '', '2023-02-20', '2026-02-20', '{"type": "Laser", "speed": "38 ppm"}'),
('Dell UltraSharp U2722DE', 'Monitor', 'Dell', 'UltraSharp U2722DE', 'DLU27001', 'EQ003', 'working', 'ห้องไอที ชั้น 2', 'วิชาญ ใจดี', '2023-03-10', '2026-03-10', '{"size": "27 inch", "resolution": "2560x1440", "panel": "IPS"}'),
('Lenovo ThinkPad X1 Carbon', 'Laptop', 'Lenovo', 'ThinkPad X1 Carbon', 'LNX1C001', 'EQ004', 'maintenance', 'ศูนย์ซ่อม', '', '2022-11-05', '2025-11-05', '{"cpu": "Intel Core i7-1165G7", "ram": "16GB LPDDR4x", "storage": "1TB SSD"}'),
('Cisco Catalyst 2960-X', 'Network Device', 'Cisco', 'Catalyst 2960-X', 'CSC2960001', 'EQ005', 'working', 'ห้องเซิร์ฟเวอร์ ชั้น B1', '', '2023-05-12', '2028-05-12', '{"ports": "24x 1GbE", "type": "Managed Switch"});