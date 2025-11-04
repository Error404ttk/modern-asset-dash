-- Create table for IT round tracking per equipment
CREATE TABLE public.equipment_it_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  frequency_months INTEGER NOT NULL CHECK (frequency_months IN (1, 3, 6, 12)),
  performed_at DATE NOT NULL,
  next_due_at DATE NOT NULL,
  technician TEXT,
  activities JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'overdue')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.equipment_it_rounds.activities IS
  'Stores task completion flags such as power_check, dust_cleaning, virus_scan, etc.';

-- Helpful indexes for lookups and reporting
CREATE INDEX equipment_it_rounds_equipment_idx ON public.equipment_it_rounds(equipment_id);
CREATE INDEX equipment_it_rounds_next_due_idx ON public.equipment_it_rounds(next_due_at);
CREATE INDEX equipment_it_rounds_status_idx ON public.equipment_it_rounds(status);

-- Enable row level security and add permissive policies
ALTER TABLE public.equipment_it_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view IT rounds"
  ON public.equipment_it_rounds
  FOR SELECT
  USING (true);

CREATE POLICY "Everyone can insert IT rounds"
  ON public.equipment_it_rounds
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Everyone can update IT rounds"
  ON public.equipment_it_rounds
  FOR UPDATE
  USING (true);

CREATE POLICY "Everyone can delete IT rounds"
  ON public.equipment_it_rounds
  FOR DELETE
  USING (true);

-- Keep updated_at current
CREATE TRIGGER update_equipment_it_rounds_updated_at
  BEFORE UPDATE ON public.equipment_it_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
