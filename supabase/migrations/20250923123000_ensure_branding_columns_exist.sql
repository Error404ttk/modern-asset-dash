-- Ensure branding-related columns exist for organization settings
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS app_title TEXT DEFAULT 'ระบบครุภัณฑ์';

-- Backfill title where missing so UI has something to display
UPDATE public.organization_settings
SET app_title = COALESCE(NULLIF(app_title, ''), name)
WHERE app_title IS NULL OR app_title = '';

-- Prompt PostgREST to reload the schema cache so new columns are exposed
NOTIFY pgrst, 'reload schema';
