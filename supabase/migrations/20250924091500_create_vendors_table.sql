-- Create vendors table for supplier/contractor/donor contacts
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and policies consistent with other master data tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view vendors"
ON public.vendors
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage vendors"
ON public.vendors
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Keep updated_at in sync
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Store supplier information alongside equipment records
ALTER TABLE public.equipment
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id),
  ADD COLUMN vendor_name TEXT,
  ADD COLUMN vendor_phone TEXT,
  ADD COLUMN vendor_address TEXT;
