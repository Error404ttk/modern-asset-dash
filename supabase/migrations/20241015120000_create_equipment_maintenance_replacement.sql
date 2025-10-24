-- Create table for equipment maintenance records
CREATE TABLE public.equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT NOT NULL UNIQUE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.ink_suppliers(id) ON DELETE SET NULL,
  department TEXT,
  technician TEXT,
  issue_summary TEXT,
  work_done TEXT,
  parts_replaced TEXT[] DEFAULT ARRAY[]::TEXT[],
  sent_at DATE,
  returned_at DATE,
  warranty_until DATE,
  cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attachments for maintenance records
CREATE TABLE public.equipment_maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES public.equipment_maintenance(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for equipment replacement purchases
CREATE TABLE public.equipment_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_no TEXT NOT NULL UNIQUE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.ink_suppliers(id) ON DELETE SET NULL,
  department TEXT,
  requested_by TEXT,
  approved_by TEXT,
  justification TEXT,
  order_date DATE,
  received_date DATE,
  warranty_until DATE,
  cost NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('planned', 'ordered', 'received')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attachments for replacement records
CREATE TABLE public.equipment_replacement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replacement_id UUID NOT NULL REFERENCES public.equipment_replacements(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX equipment_maintenance_equipment_idx ON public.equipment_maintenance(equipment_id);
CREATE INDEX equipment_maintenance_supplier_idx ON public.equipment_maintenance(supplier_id);
CREATE INDEX equipment_maintenance_status_idx ON public.equipment_maintenance(status);

CREATE INDEX equipment_replacements_equipment_idx ON public.equipment_replacements(equipment_id);
CREATE INDEX equipment_replacements_supplier_idx ON public.equipment_replacements(supplier_id);
CREATE INDEX equipment_replacements_status_idx ON public.equipment_replacements(status);

-- Enable row level security
ALTER TABLE public.equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_replacement_attachments ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies (adjust as needed for production)
CREATE POLICY "Everyone can view maintenance" ON public.equipment_maintenance FOR SELECT USING (true);
CREATE POLICY "Everyone can insert maintenance" ON public.equipment_maintenance FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update maintenance" ON public.equipment_maintenance FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete maintenance" ON public.equipment_maintenance FOR DELETE USING (true);

CREATE POLICY "Everyone can view maintenance attachments" ON public.equipment_maintenance_attachments FOR SELECT USING (true);
CREATE POLICY "Everyone can insert maintenance attachments" ON public.equipment_maintenance_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can delete maintenance attachments" ON public.equipment_maintenance_attachments FOR DELETE USING (true);

CREATE POLICY "Everyone can view replacements" ON public.equipment_replacements FOR SELECT USING (true);
CREATE POLICY "Everyone can insert replacements" ON public.equipment_replacements FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update replacements" ON public.equipment_replacements FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete replacements" ON public.equipment_replacements FOR DELETE USING (true);

CREATE POLICY "Everyone can view replacement attachments" ON public.equipment_replacement_attachments FOR SELECT USING (true);
CREATE POLICY "Everyone can insert replacement attachments" ON public.equipment_replacement_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can delete replacement attachments" ON public.equipment_replacement_attachments FOR DELETE USING (true);

-- Reuse existing timestamp trigger helper
CREATE TRIGGER update_equipment_maintenance_updated_at
  BEFORE UPDATE ON public.equipment_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_replacements_updated_at
  BEFORE UPDATE ON public.equipment_replacements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
