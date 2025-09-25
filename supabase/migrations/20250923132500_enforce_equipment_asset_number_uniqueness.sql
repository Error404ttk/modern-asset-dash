-- Reapply the uniqueness guarantee on asset_number after format normalization
ALTER TABLE public.equipment
DROP CONSTRAINT IF EXISTS equipment_asset_number_unique;

ALTER TABLE public.equipment
ADD CONSTRAINT equipment_asset_number_unique UNIQUE (asset_number);
