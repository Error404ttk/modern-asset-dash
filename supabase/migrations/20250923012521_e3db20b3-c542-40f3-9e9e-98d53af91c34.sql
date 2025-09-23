-- Fix critical security vulnerability in equipment table
-- Replace overly permissive RLS policies with secure authentication-based policies

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Everyone can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Everyone can update equipment" ON public.equipment;

-- Create secure INSERT policies
-- Super admins can insert any equipment
CREATE POLICY "Super admins can insert equipment"
ON public.equipment
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Authenticated users can insert equipment (but not anonymous users)
CREATE POLICY "Authenticated users can insert equipment"
ON public.equipment
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create secure UPDATE policies  
-- Super admins can update any equipment
CREATE POLICY "Super admins can update all equipment"
ON public.equipment
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Authenticated users can update equipment (but not anonymous users)
CREATE POLICY "Authenticated users can update equipment"
ON public.equipment
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Note: SELECT policy "Everyone can view equipment" remains unchanged as equipment viewing appears to be intentionally public
-- Note: DELETE policy "Only super admins can delete equipment" remains unchanged as it's already secure