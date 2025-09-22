-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance', 'damaged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create borrow_transactions table for tracking borrowing history
CREATE TABLE public.borrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  borrower_name TEXT NOT NULL,
  borrower_contact TEXT,
  borrowed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return_at TIMESTAMP WITH TIME ZONE,
  returned_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment (public read access for now, can be restricted later)
CREATE POLICY "Everyone can view equipment" 
ON public.equipment 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert equipment" 
ON public.equipment 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update equipment" 
ON public.equipment 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete equipment" 
ON public.equipment 
FOR DELETE 
USING (true);

-- Create policies for borrow_transactions
CREATE POLICY "Everyone can view borrow transactions" 
ON public.borrow_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert borrow transactions" 
ON public.borrow_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update borrow transactions" 
ON public.borrow_transactions 
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

-- Create trigger for automatic timestamp updates on equipment
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.equipment (name, type, brand, model, location, status) VALUES
('โน๊ตบุ๊ค Dell Latitude 1', 'Computer', 'Dell', 'Latitude 5520', 'ชั้น 2 ห้อง IT', 'available'),
('โปรเจคเตอร์ Epson', 'Projector', 'Epson', 'EB-X41', 'ห้องประชุมใหญ่', 'available'),
('เครื่องพิมพ์ HP LaserJet', 'Printer', 'HP', 'LaserJet Pro M404dn', 'ชั้น 1 ฝ่ายบัญชี', 'maintenance'),
('กล้อง Canon DSLR', 'Camera', 'Canon', 'EOS 2000D', 'ห้องแอดมิน', 'borrowed'),
('หูฟัง Sony WH-1000XM4', 'Audio', 'Sony', 'WH-1000XM4', 'ห้องบันทึกเสียง', 'available'),
('จอมอนิเตอร์ LG 24"', 'Monitor', 'LG', '24MK430H-B', 'ชั้น 2 ห้อง IT', 'available'),
('เมาส์ Logitech MX Master', 'Accessory', 'Logitech', 'MX Master 3', 'คลังอุปกรณ์', 'available'),
('คีย์บอร์ด Mechanical', 'Accessory', 'Keychron', 'K2 V2', 'คลังอุปกรณ์', 'damaged');

-- Insert sample borrow transaction
INSERT INTO public.borrow_transactions (equipment_id, user_id, borrower_name, borrower_contact, status, notes) 
SELECT id, gen_random_uuid(), 'นายสมชาย ใจดี', '081-234-5678', 'borrowed', 'ยืมไปใช้งานโครงการถ่ายภาพ'
FROM public.equipment 
WHERE name = 'กล้อง Canon DSLR' 
LIMIT 1;