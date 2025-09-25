-- Ensure asset numbers include their sequence suffix (e.g. 7440-001-0001/1)
UPDATE public.equipment
SET asset_number = asset_number || '/' || quantity::text
WHERE asset_number IS NOT NULL
  AND asset_number <> ''
  AND quantity IS NOT NULL
  AND asset_number NOT LIKE '%/%';

-- Align quantity with the numeric suffix when present in asset_number
UPDATE public.equipment
SET quantity = split_part(asset_number, '/', 2)::integer
WHERE asset_number LIKE '%/%'
  AND split_part(asset_number, '/', 2) ~ '^[0-9]+$';
