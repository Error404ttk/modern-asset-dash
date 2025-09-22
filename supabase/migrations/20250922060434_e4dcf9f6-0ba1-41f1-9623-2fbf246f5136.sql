-- Remove any existing placeholder profile
DELETE FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Create super admin user using auth API (this will be done manually)
-- For now, we'll create a function to help create the user programmatically

CREATE OR REPLACE FUNCTION create_super_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- This function can be called after creating the user via Supabase Auth
    -- to automatically create the profile
    NULL;
END;
$$;