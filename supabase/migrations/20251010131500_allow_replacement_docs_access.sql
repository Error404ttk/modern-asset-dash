-- Allow authenticated users to manage replacement document files
BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('replacement-docs', 'replacement-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated read replacement docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert replacement docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update replacement docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete replacement docs" ON storage.objects;

CREATE POLICY "Allow authenticated read replacement docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'replacement-docs');

CREATE POLICY "Allow authenticated insert replacement docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'replacement-docs');

CREATE POLICY "Allow authenticated update replacement docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'replacement-docs')
  WITH CHECK (bucket_id = 'replacement-docs');

CREATE POLICY "Allow authenticated delete replacement docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'replacement-docs');

COMMIT;
