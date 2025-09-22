-- Add missing columns to equipment table
ALTER TABLE public.equipment 
ADD COLUMN serial_number TEXT,
ADD COLUMN asset_number TEXT NOT NULL DEFAULT '',
ADD COLUMN current_user TEXT,
ADD COLUMN purchase_date DATE,
ADD COLUMN warranty_end DATE,
ADD COLUMN specs JSONB DEFAULT '{}'::jsonb;

-- Create indexes for better performance
CREATE INDEX idx_equipment_asset_number ON public.equipment(asset_number);
CREATE INDEX idx_equipment_serial_number ON public.equipment(serial_number);
CREATE INDEX idx_equipment_status ON public.equipment(status);

-- Update existing records to have asset numbers (using a sequential pattern)
UPDATE public.equipment 
SET asset_number = 'EQ' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 6, '0')
WHERE asset_number = '';

-- Make asset_number unique after setting values
ALTER TABLE public.equipment ADD CONSTRAINT equipment_asset_number_unique UNIQUE (asset_number);