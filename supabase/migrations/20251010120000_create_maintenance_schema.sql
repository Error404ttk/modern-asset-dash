-- Create maintenance status type
CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Create replacement status type
CREATE TYPE replacement_status AS ENUM ('requested', 'approved', 'ordered', 'received', 'installed', 'rejected', 'cancelled');

-- Create equipment_maintenance table
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_no TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  technician TEXT,
  issue_summary TEXT,
  work_done TEXT,
  parts_replaced TEXT[],
  sent_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  warranty_until DATE,
  cost DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  status maintenance_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create equipment_maintenance_attachments table
CREATE TABLE IF NOT EXISTS equipment_maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID NOT NULL REFERENCES equipment_maintenance(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create equipment_replacements table
CREATE TABLE IF NOT EXISTS equipment_replacements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_no TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  requested_by TEXT,
  approved_by TEXT,
  justification TEXT,
  order_date DATE,
  received_date DATE,
  warranty_until DATE,
  cost DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  status replacement_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create equipment_replacement_attachments table
CREATE TABLE IF NOT EXISTS equipment_replacement_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  replacement_id UUID NOT NULL REFERENCES equipment_replacements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for better query performance
CREATE INDEX idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_status ON equipment_maintenance(status);
CREATE INDEX idx_equipment_maintenance_created_at ON equipment_maintenance(created_at);
CREATE INDEX idx_equipment_maintenance_attachments ON equipment_maintenance_attachments(maintenance_id);
CREATE INDEX idx_equipment_replacements_equipment_id ON equipment_replacements(equipment_id);
CREATE INDEX idx_equipment_replacements_status ON equipment_replacements(status);
CREATE INDEX idx_equipment_replacements_created_at ON equipment_replacements(created_at);
CREATE INDEX idx_equipment_replacement_attachments ON equipment_replacement_attachments(replacement_id);

-- Add RLS policies for equipment_maintenance
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
  ON equipment_maintenance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON equipment_maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for owners and admins"
  ON equipment_maintenance
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Add RLS policies for equipment_maintenance_attachments
ALTER TABLE equipment_maintenance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on attachments"
  ON equipment_maintenance_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on attachments"
  ON equipment_maintenance_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add RLS policies for equipment_replacements
ALTER TABLE equipment_replacements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on replacements"
  ON equipment_replacements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on replacements"
  ON equipment_replacements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for owners and admins on replacements"
  ON equipment_replacements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Add RLS policies for equipment_replacement_attachments
ALTER TABLE equipment_replacement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on replacement attachments"
  ON equipment_replacement_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on replacement attachments"
  ON equipment_replacement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add storage bucket for maintenance attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('maintenance-attachments', 'maintenance-attachments', false, 10485760, '{"image/*","application/pdf"}');

-- Add storage bucket for replacement attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('replacement-attachments', 'replacement-attachments', false, 10485760, '{"image/*","application/pdf"}');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_equipment_maintenance_modtime
BEFORE UPDATE ON equipment_maintenance
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_equipment_replacements_modtime
BEFORE UPDATE ON equipment_replacements
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create function to generate document numbers
CREATE OR REPLACE FUNCTION generate_document_number(prefix TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num BIGINT;
  next_num_str TEXT;
  year_str TEXT;
  month_str TEXT;
  doc_num TEXT;
BEGIN
  -- Get current year and month
  year_str := TO_CHAR(CURRENT_DATE, 'YY');
  month_str := TO_CHAR(CURRENT_DATE, 'MM');
  
  -- Get the next sequence number
  EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(document_no FROM ''%s-\d{2}\d{2}-(\d+)'') AS BIGINT)), 0) + 1 FROM %I', 
                prefix, table_name) INTO next_num;
  
  -- Format the number with leading zeros
  next_num_str := LPAD(next_num::TEXT, 4, '0');
  
  -- Combine into document number
  doc_num := format('%s-%s%s-%s', prefix, year_str, month_str, next_num_str);
  
  RETURN doc_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next maintenance document number
CREATE OR REPLACE FUNCTION get_next_maintenance_doc_num()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_no IS NULL THEN
    NEW.document_no := generate_document_number('MNT', 'equipment_maintenance');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next replacement document number
CREATE OR REPLACE FUNCTION get_next_replacement_doc_num()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_no IS NULL THEN
    NEW.document_no := generate_document_number('RPL', 'equipment_replacements');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for document numbers
CREATE TRIGGER set_maintenance_doc_num
BEFORE INSERT ON equipment_maintenance
FOR EACH ROW
WHEN (NEW.document_no IS NULL)
EXECUTE FUNCTION get_next_maintenance_doc_num();

CREATE TRIGGER set_replacement_doc_num
BEFORE INSERT ON equipment_replacements
FOR EACH ROW
WHEN (NEW.document_no IS NULL)
EXECUTE FUNCTION get_next_replacement_doc_num();
