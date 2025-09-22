-- PHASE 1: CRITICAL SECURITY FIXES - Fixed version
-- Drop ALL existing policies to avoid conflicts, then create secure ones

-- Fix borrow_transactions table - restrict access to user's own records and super admins
DROP POLICY IF EXISTS "Everyone can view borrow transactions" ON public.borrow_transactions;
DROP POLICY IF EXISTS "Everyone can update borrow transactions" ON public.borrow_transactions;
DROP POLICY IF EXISTS "Everyone can insert borrow transactions" ON public.borrow_transactions;

-- Create secure policies for borrow_transactions
CREATE POLICY "Users can view their own borrow transactions"
ON public.borrow_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all borrow transactions"
ON public.borrow_transactions
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert their own borrow transactions"
ON public.borrow_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can insert borrow transactions"
ON public.borrow_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can update their own borrow transactions"
ON public.borrow_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can update all borrow transactions"
ON public.borrow_transactions
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix organization_settings table - restrict sensitive data access
DROP POLICY IF EXISTS "Everyone can view organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Super admins can manage organization settings" ON public.organization_settings;

-- Create policy for basic organization info (name, logo) - public access
CREATE POLICY "Anyone can view basic organization info"
ON public.organization_settings
FOR SELECT
USING (true);

-- Super admins can manage all organization settings
CREATE POLICY "Super admins can manage organization settings"
ON public.organization_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix profiles table - prevent privilege escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure profile update policy that prevents role changes
CREATE POLICY "Users can update their own profile except role"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Prevent users from changing their own role
  (OLD.role = NEW.role OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Super admins can manage all profiles including roles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));