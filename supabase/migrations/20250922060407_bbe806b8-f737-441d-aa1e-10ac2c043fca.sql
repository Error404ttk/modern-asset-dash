-- Create super admin user
-- First, we need to insert into auth.users (this requires service role)
-- Instead, we'll create the user manually and then create the profile

-- Insert super admin profile for the user that will be created manually
-- The user_id will need to be updated after creating the user in Supabase Auth
INSERT INTO public.profiles (id, user_id, email, full_name, role)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder, will be updated
  'srpadmin@system.local',
  'Super Administrator',
  'super_admin'
);

-- Note: The actual user creation in auth.users must be done through Supabase Auth
-- After creating the user manually, update the user_id in the profile