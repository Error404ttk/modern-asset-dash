-- Create storage bucket for equipment images
INSERT INTO storage.buckets (id, name, public) VALUES ('equipment-images', 'equipment-images', true);

-- Create RLS policies for equipment images
CREATE POLICY "Anyone can view equipment images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'equipment-images');

CREATE POLICY "Anyone can upload equipment images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'equipment-images');

CREATE POLICY "Anyone can update equipment images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'equipment-images');

CREATE POLICY "Anyone can delete equipment images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'equipment-images');

-- Add images column to equipment table
ALTER TABLE public.equipment 
ADD COLUMN images text[] DEFAULT '{}';