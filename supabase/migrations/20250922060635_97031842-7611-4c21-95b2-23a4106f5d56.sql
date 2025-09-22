-- Fix function search path security warning
DROP FUNCTION IF EXISTS create_super_admin_user();

CREATE OR REPLACE FUNCTION create_super_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function is for documentation purposes only
    -- The super admin user must be created manually via Supabase Auth
    RAISE NOTICE 'Create user manually via Supabase Auth dashboard';
END;
$$;