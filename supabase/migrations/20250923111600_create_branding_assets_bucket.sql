-- Create storage bucket for branding assets such as logos and favicons
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow reading branding assets without authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view branding assets'
  ) THEN
    CREATE POLICY "Anyone can view branding assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'branding-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can insert branding assets'
  ) THEN
    CREATE POLICY "Authenticated can insert branding assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'branding-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can update branding assets'
  ) THEN
    CREATE POLICY "Authenticated can update branding assets"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'branding-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can delete branding assets'
  ) THEN
    CREATE POLICY "Authenticated can delete branding assets"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'branding-assets');
  END IF;
END $$;
