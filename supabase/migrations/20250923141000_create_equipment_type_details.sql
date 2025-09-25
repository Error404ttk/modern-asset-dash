-- Create equipment_type_details table to manage subtype definitions per equipment type
CREATE TABLE public.equipment_type_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_type_id UUID NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT equipment_type_details_code_unique UNIQUE (code)
);

CREATE INDEX idx_equipment_type_details_type_id
  ON public.equipment_type_details (equipment_type_id);

ALTER TABLE public.equipment_type_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view equipment type details"
ON public.equipment_type_details
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage equipment type details"
ON public.equipment_type_details
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_equipment_type_details_updated_at
BEFORE UPDATE ON public.equipment_type_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
