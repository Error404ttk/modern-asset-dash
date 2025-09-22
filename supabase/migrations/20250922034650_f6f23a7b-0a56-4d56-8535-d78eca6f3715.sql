-- Add missing columns to equipment table
ALTER TABLE public.equipment 
ADD COLUMN serial_number TEXT,
ADD COLUMN asset_number TEXT NOT NULL DEFAULT '',
ADD COLUMN assigned_to TEXT,
ADD COLUMN purchase_date DATE,
ADD COLUMN warranty_end DATE,
ADD COLUMN specs JSONB DEFAULT '{}'::jsonb;

-- Create indexes for better performance
CREATE INDEX idx_equipment_asset_number ON public.equipment(asset_number);
CREATE INDEX idx_equipment_serial_number ON public.equipment(serial_number);
CREATE INDEX idx_equipment_status ON public.equipment(status);

-- Create a function to generate asset numbers
CREATE OR REPLACE FUNCTION generate_asset_numbers()
RETURNS void AS $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
BEGIN
    FOR rec IN SELECT id FROM public.equipment WHERE asset_number = '' ORDER BY created_at LOOP
        UPDATE public.equipment 
        SET asset_number = 'EQ' || LPAD(counter::text, 6, '0')
        WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to generate asset numbers
SELECT generate_asset_numbers();

-- Drop the function after use
DROP FUNCTION generate_asset_numbers();

-- Make asset_number unique after setting values
ALTER TABLE public.equipment ADD CONSTRAINT equipment_asset_number_unique UNIQUE (asset_number);