-- Remove Sticker Print specific organization settings
ALTER TABLE IF EXISTS public.organization_settings
  DROP COLUMN IF EXISTS sticker_width_mm,
  DROP COLUMN IF EXISTS sticker_height_mm;
