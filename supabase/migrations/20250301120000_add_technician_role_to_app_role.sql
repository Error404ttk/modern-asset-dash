-- Allow technician role in application enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';
