-- Fix critical security vulnerability: Restrict audit logs access to super admins only

-- Drop the permissive policy that allows everyone to view audit logs
DROP POLICY IF EXISTS "Everyone can view audit logs" ON public.audit_logs;

-- Create a new policy that restricts SELECT access to super admins only
CREATE POLICY "Super admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Keep the existing INSERT policy unchanged to maintain audit functionality
-- (The "Everyone can insert audit logs" policy remains active)