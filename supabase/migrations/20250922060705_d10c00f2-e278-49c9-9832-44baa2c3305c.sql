-- Create profile for existing super admin user
INSERT INTO public.profiles (user_id, email, full_name, role)
VALUES (
  'c388848b-9290-4d85-8893-6dc2c7ff4d11',
  'srpadmin@system.local',
  'Super Administrator',
  'super_admin'
);