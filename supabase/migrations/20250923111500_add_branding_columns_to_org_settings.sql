-- Add branding fields to organization settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS app_title TEXT DEFAULT 'ระบบครุภัณฑ์';

-- Backfill existing rows so the new app_title mirrors the current organization name when missing
UPDATE public.organization_settings
SET app_title = name
WHERE app_title IS NULL OR app_title = '';

-- Refresh PostgREST schema cache so the new columns are available immediately
NOTIFY pgrst, 'reload schema';
