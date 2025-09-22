-- Update existing profile to super admin role
UPDATE public.profiles 
SET 
  email = 'srpadmin@system.local',
  full_name = 'Super Administrator',
  role = 'super_admin'
WHERE user_id = 'c388848b-9290-4d85-8893-6dc2c7ff4d11';