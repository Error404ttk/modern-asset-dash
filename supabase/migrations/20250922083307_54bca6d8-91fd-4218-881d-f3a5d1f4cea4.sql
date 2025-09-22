-- Delete all data except super admin
-- First, delete all borrow transactions
DELETE FROM public.borrow_transactions;

-- Delete all equipment
DELETE FROM public.equipment;

-- Delete all departments
DELETE FROM public.departments;

-- Delete all equipment types  
DELETE FROM public.equipment_types;

-- Delete all organization settings
DELETE FROM public.organization_settings;

-- Delete all audit logs
DELETE FROM public.audit_logs;

-- Delete all profiles except super admin
DELETE FROM public.profiles 
WHERE role != 'super_admin';

-- Reset sequences if any exist
-- This ensures new records start from 1 again