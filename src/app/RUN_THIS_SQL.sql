-- =====================================================
-- CLIENT & VENDOR TABLES - QUICK SETUP
-- =====================================================
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Click "New Query"
-- 4. Paste this code
-- 5. Click "Run"
-- 6. Wait for "Success. No rows returned"
-- =====================================================

-- =====================================================
-- TABLE 1: CLIENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  status text DEFAULT 'Lead',
  projects_count integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  source text,
  notes text,
  last_contact timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;

-- Create policies
CREATE POLICY "Allow authenticated users to read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- =====================================================
-- TABLE 2: VENDORS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  rating numeric DEFAULT 0,
  total_projects integer DEFAULT 0,
  on_time_delivery numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  contact jsonb, -- { email, phone, address }
  services jsonb, -- string[]
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow authenticated users to insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow authenticated users to update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow authenticated users to delete vendors" ON public.vendors;

-- Create policies
CREATE POLICY "Allow authenticated users to read vendors"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert vendors"
  ON public.vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vendors"
  ON public.vendors
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete vendors"
  ON public.vendors
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON public.vendors(rating DESC);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON public.vendors(created_at DESC);

-- =====================================================
-- OPTIONAL: INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Uncomment the lines below if you want to insert sample data

-- Sample clients
-- INSERT INTO public.clients (name, email, phone, company, status, notes) VALUES
--   ('John Smith', 'john@example.com', '555-0101', 'Smith Homes', 'Active', 'Regular client for residential projects'),
--   ('Jane Doe', 'jane@example.com', '555-0102', 'Doe Enterprises', 'Lead', 'Potential client for office renovation'),
--   ('Bob Johnson', 'bob@example.com', '555-0103', 'Johnson Properties', 'Active', 'Multiple ongoing projects')
-- ON CONFLICT (id) DO NOTHING;

-- Sample vendors
-- INSERT INTO public.vendors (name, category, rating, contact, services) VALUES
--   ('Home Depot', 'Materials', 4.5, '{"email": "supplies@homedepot.com", "phone": "555-1000"}', '["Lumber", "Hardware", "Paint"]'),
--   ('ABC Electrical', 'Subcontractor', 4.8, '{"email": "info@abcelectric.com", "phone": "555-2000"}', '["Wiring", "Panel Upgrades", "Lighting"]'),
--   ('Premium Flooring Co', 'Materials', 4.2, '{"email": "sales@premiumflooring.com", "phone": "555-3000"}', '["Hardwood", "Tile", "Carpet"]')
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the migration to verify everything worked:

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('clients', 'vendors');

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('clients', 'vendors');

-- Count records
-- SELECT 'clients' as table_name, COUNT(*) as count FROM public.clients
-- UNION ALL
-- SELECT 'vendors' as table_name, COUNT(*) as count FROM public.vendors;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- If you see "Success. No rows returned", the migration worked!
-- 
-- Next steps:
-- 1. Go to your app
-- 2. Create a client in the CRM module
-- 3. Create a vendor in the Vendors module
-- 4. Go to Finance → Add Transaction
-- 5. Check that dropdowns show your data ✅
-- =====================================================
