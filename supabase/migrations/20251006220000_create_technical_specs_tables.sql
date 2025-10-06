-- Create technical specifications tables for computer equipment
-- These tables will store master data for CPU, RAM, Harddisk, OS, and Office specs

-- CPU specifications table
CREATE TABLE public.technical_specs_cpu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  cores INTEGER,
  threads INTEGER,
  base_clock_ghz DECIMAL(4,2),
  boost_clock_ghz DECIMAL(4,2),
  cache_mb INTEGER,
  socket TEXT,
  generation TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RAM specifications table
CREATE TABLE public.technical_specs_ram (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- DDR3, DDR4, DDR5
  capacity_gb INTEGER NOT NULL,
  speed_mhz INTEGER,
  modules INTEGER DEFAULT 1,
  form_factor TEXT, -- DIMM, SODIMM
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Harddisk specifications table
CREATE TABLE public.technical_specs_harddisk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- HDD, SSD, NVMe
  capacity_gb INTEGER NOT NULL,
  interface TEXT, -- SATA, PCIe, M.2
  form_factor TEXT, -- 2.5", 3.5", M.2
  manufacturer TEXT,
  model TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Operating System specifications table
CREATE TABLE public.technical_specs_os (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  edition TEXT, -- Home, Pro, Enterprise
  architecture TEXT, -- 32-bit, 64-bit
  manufacturer TEXT, -- Microsoft, Apple, Linux distributions
  license_type TEXT, -- OEM, Retail, Volume
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Office Suite specifications table
CREATE TABLE public.technical_specs_office (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  edition TEXT, -- Standard, Professional, Enterprise
  license_type TEXT, -- Perpetual, Subscription
  manufacturer TEXT, -- Microsoft, LibreOffice, etc.
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and policies for all tables
ALTER TABLE public.technical_specs_cpu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_specs_ram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_specs_harddisk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_specs_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_specs_office ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active technical specs
CREATE POLICY "Everyone can view active cpu specs"
ON public.technical_specs_cpu FOR SELECT
USING (active = true);

CREATE POLICY "Everyone can view active ram specs"
ON public.technical_specs_ram FOR SELECT
USING (active = true);

CREATE POLICY "Everyone can view active harddisk specs"
ON public.technical_specs_harddisk FOR SELECT
USING (active = true);

CREATE POLICY "Everyone can view active os specs"
ON public.technical_specs_os FOR SELECT
USING (active = true);

CREATE POLICY "Everyone can view active office specs"
ON public.technical_specs_office FOR SELECT
USING (active = true);

-- Only super admins can manage technical specs
CREATE POLICY "Super admins can manage cpu specs"
ON public.technical_specs_cpu FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage ram specs"
ON public.technical_specs_ram FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage harddisk specs"
ON public.technical_specs_harddisk FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage os specs"
ON public.technical_specs_os FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage office specs"
ON public.technical_specs_office FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Keep updated_at in sync for all tables
CREATE TRIGGER update_technical_specs_cpu_updated_at
BEFORE UPDATE ON public.technical_specs_cpu
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_specs_ram_updated_at
BEFORE UPDATE ON public.technical_specs_ram
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_specs_harddisk_updated_at
BEFORE UPDATE ON public.technical_specs_harddisk
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_specs_os_updated_at
BEFORE UPDATE ON public.technical_specs_os
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_specs_office_updated_at
BEFORE UPDATE ON public.technical_specs_office
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraints to prevent duplicate entries
ALTER TABLE public.technical_specs_cpu
ADD CONSTRAINT unique_cpu_name UNIQUE (name);

ALTER TABLE public.technical_specs_ram
ADD CONSTRAINT unique_ram_spec UNIQUE (type, capacity_gb, speed_mhz);

ALTER TABLE public.technical_specs_harddisk
ADD CONSTRAINT unique_harddisk_spec UNIQUE (type, capacity_gb, interface);

ALTER TABLE public.technical_specs_os
ADD CONSTRAINT unique_os_name UNIQUE (name, version, architecture);

ALTER TABLE public.technical_specs_office
ADD CONSTRAINT unique_office_name UNIQUE (name, version);
