-- Add quantity column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN quantity integer NOT NULL DEFAULT 1;