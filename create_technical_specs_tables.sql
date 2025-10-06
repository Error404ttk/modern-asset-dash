-- SQL script to create technical specifications tables
-- Run this in your Supabase SQL editor or via supabase CLI

-- Create CPU specifications table
CREATE TABLE IF NOT EXISTS technical_specs_cpu (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    cores INTEGER,
    threads INTEGER,
    base_clock_ghz DECIMAL,
    boost_clock_ghz DECIMAL,
    cache_mb INTEGER,
    socket TEXT,
    generation TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RAM specifications table
CREATE TABLE IF NOT EXISTS technical_specs_ram (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DDR3', 'DDR4', 'DDR5')),
    capacity_gb INTEGER NOT NULL,
    speed_mhz INTEGER,
    modules INTEGER,
    form_factor TEXT CHECK (form_factor IN ('DIMM', 'SODIMM')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Harddisk specifications table
CREATE TABLE IF NOT EXISTS technical_specs_harddisk (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('HDD', 'SSD', 'NVMe')),
    capacity_gb INTEGER NOT NULL,
    interface TEXT CHECK (interface IN ('SATA', 'PCIe', 'M.2')),
    form_factor TEXT CHECK (form_factor IN ('2.5"', '3.5"', 'M.2')),
    manufacturer TEXT,
    model TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create OS specifications table
CREATE TABLE IF NOT EXISTS technical_specs_os (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    edition TEXT,
    architecture TEXT CHECK (architecture IN ('32-bit', '64-bit')),
    manufacturer TEXT,
    license_type TEXT CHECK (license_type IN ('OEM', 'Retail', 'Volume')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Office specifications table
CREATE TABLE IF NOT EXISTS technical_specs_office (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    edition TEXT,
    license_type TEXT CHECK (license_type IN ('Perpetual', 'Subscription')),
    manufacturer TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_technical_specs_cpu_name ON technical_specs_cpu(name);
CREATE INDEX IF NOT EXISTS idx_technical_specs_cpu_active ON technical_specs_cpu(active);

CREATE INDEX IF NOT EXISTS idx_technical_specs_ram_name ON technical_specs_ram(name);
CREATE INDEX IF NOT EXISTS idx_technical_specs_ram_active ON technical_specs_ram(active);

CREATE INDEX IF NOT EXISTS idx_technical_specs_harddisk_name ON technical_specs_harddisk(name);
CREATE INDEX IF NOT EXISTS idx_technical_specs_harddisk_active ON technical_specs_harddisk(active);

CREATE INDEX IF NOT EXISTS idx_technical_specs_os_name ON technical_specs_os(name);
CREATE INDEX IF NOT EXISTS idx_technical_specs_os_active ON technical_specs_os(active);

CREATE INDEX IF NOT EXISTS idx_technical_specs_office_name ON technical_specs_office(name);
CREATE INDEX IF NOT EXISTS idx_technical_specs_office_active ON technical_specs_office(active);

-- Enable Row Level Security (RLS)
ALTER TABLE technical_specs_cpu ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_specs_ram ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_specs_harddisk ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_specs_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_specs_office ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust based on your auth setup)
CREATE POLICY "Allow authenticated users to select technical specs" ON technical_specs_cpu
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert technical specs" ON technical_specs_cpu
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update technical specs" ON technical_specs_cpu
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete technical specs" ON technical_specs_cpu
    FOR DELETE TO authenticated USING (true);

-- Repeat policies for other tables
CREATE POLICY "Allow authenticated users to select technical specs" ON technical_specs_ram
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert technical specs" ON technical_specs_ram
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update technical specs" ON technical_specs_ram
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete technical specs" ON technical_specs_ram
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to select technical specs" ON technical_specs_harddisk
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert technical specs" ON technical_specs_harddisk
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update technical specs" ON technical_specs_harddisk
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete technical specs" ON technical_specs_harddisk
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to select technical specs" ON technical_specs_os
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert technical specs" ON technical_specs_os
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update technical specs" ON technical_specs_os
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete technical specs" ON technical_specs_os
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to select technical specs" ON technical_specs_office
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert technical specs" ON technical_specs_office
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update technical specs" ON technical_specs_office
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete technical specs" ON technical_specs_office
    FOR DELETE TO authenticated USING (true);
