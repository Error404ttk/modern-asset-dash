-- Ensure branding columns exist and refresh PostgREST cache
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS app_title TEXT DEFAULT 'ระบบครุภัณฑ์';

NOTIFY pgrst, 'reload schema';
