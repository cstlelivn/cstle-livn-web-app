import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Copy, Check, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const MIGRATION_SQL = `-- =====================================================
-- DATABASE MIGRATION: Finance & Project Transactions
-- =====================================================
-- This creates two tables:
-- 1. transactions - For general Finance tab income/expenses
-- 2. project_transactions - For project-specific purchases/payments
-- =====================================================

-- TABLE 1: TRANSACTIONS (for Finance tab)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('Income', 'Expense')),
  category text,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date timestamptz NOT NULL DEFAULT now(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed')),
  phase_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON public.transactions(vendor_id);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view transactions"
  ON public.transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert transactions"
  ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update transactions"
  ON public.transactions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete transactions"
  ON public.transactions FOR DELETE TO authenticated USING (true);

-- Create trigger for transactions updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Grant permissions on transactions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;


-- TABLE 2: PROJECT_TRANSACTIONS (for Projects tab purchases/payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text,
  type text NOT NULL CHECK (type IN ('purchase', 'payment')),
  amount numeric NOT NULL DEFAULT 0,
  reference text, -- vendor name for purchases, payee name for payments
  description text, -- item description or payment purpose
  notes text,
  date timestamptz NOT NULL DEFAULT now(),
  
  -- Purchase-specific fields (only used when type = 'purchase')
  quantity numeric,
  unit_cost numeric,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for project_transactions
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON public.project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_phase_name ON public.project_transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type ON public.project_transactions(type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date ON public.project_transactions(date);
CREATE INDEX IF NOT EXISTS idx_project_transactions_inventory_id ON public.project_transactions(inventory_id);

-- Enable RLS on project_transactions
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_transactions
CREATE POLICY "Users can view project transactions"
  ON public.project_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert project transactions"
  ON public.project_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update project transactions"
  ON public.project_transactions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete project transactions"
  ON public.project_transactions FOR DELETE TO authenticated USING (true);

-- Create trigger for project_transactions updated_at
CREATE OR REPLACE FUNCTION update_project_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_transactions_updated_at
  BEFORE UPDATE ON public.project_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_transactions_updated_at();

-- Grant permissions on project_transactions
GRANT ALL ON public.project_transactions TO authenticated;
GRANT ALL ON public.project_transactions TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.transactions IS 'General finance transactions (income/expenses) shown in Finance tab';
COMMENT ON COLUMN public.transactions.transaction_type IS 'Transaction type: Income or Expense';

COMMENT ON TABLE public.project_transactions IS 'Project-specific financial transactions including purchases and payments';
COMMENT ON COLUMN public.project_transactions.type IS 'Transaction type: purchase (materials/tools) or payment (labor/services)';
COMMENT ON COLUMN public.project_transactions.reference IS 'Vendor name for purchases, payee name for payments';
COMMENT ON COLUMN public.project_transactions.inventory_id IS 'Links to inventory item if this purchase affects inventory';`;

export default function MigrationInstructions() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy SQL');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle 
          style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontVariationSettings: "'wdth' 137",
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-bold)'
          }}
        >
          <Database className="inline-block mr-2 h-5 w-5" />
          Create Finance & Project Transactions Tables
        </CardTitle>
        <CardDescription
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Follow these steps to set up both database tables: transactions (Finance tab) and project_transactions (Projects tab)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step-by-step instructions */}
        <div 
          className="p-4 rounded-lg border border-primary/20 bg-primary/5"
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <h4 
            style={{ 
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-3)'
            }}
          >
            📋 Setup Instructions:
          </h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Open your{' '}
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                Supabase Dashboard
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </li>
            <li>Select your project from the project list</li>
            <li>Navigate to <strong>SQL Editor</strong> in the left sidebar</li>
            <li>Click <strong>New Query</strong> button</li>
            <li>Click the <strong>Copy SQL</strong> button below</li>
            <li>Paste the SQL into the editor</li>
            <li>Click <strong>Run</strong> (or press Cmd/Ctrl + Enter)</li>
            <li>Wait for the success message</li>
            <li>Refresh this page to verify the table was created</li>
          </ol>
        </div>

        {/* Copy button */}
        <div className="flex gap-2">
          <Button 
            onClick={copyToClipboard}
            className="flex-1"
            style={{ 
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy SQL to Clipboard
              </>
            )}
          </Button>
        </div>

        {/* SQL Preview */}
        <div>
          <h4 
            style={{ 
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-2)'
            }}
          >
            SQL Migration Preview:
          </h4>
          <div className="relative">
            <pre 
              className="p-4 bg-muted rounded-lg overflow-auto max-h-[400px] border border-border"
              style={{ 
                fontFamily: "'Roboto Mono', monospace",
                fontSize: 'var(--text-xs)',
              }}
            >
              {MIGRATION_SQL}
            </pre>
            <Button
              onClick={copyToClipboard}
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              style={{ 
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Important notes */}
        <div 
          className="p-3 rounded border border-warning bg-warning/10"
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <strong style={{ fontWeight: 'var(--font-weight-bold)' }}>⚠️ Important Notes:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>This SQL is <strong>safe to run multiple times</strong> (uses IF NOT EXISTS)</li>
            <li>Make sure you're connected to the <strong>correct project</strong> in Supabase</li>
            <li>After running, you may need to <strong>restart PostgREST</strong> if the table doesn't appear immediately (Settings → API → Restart)</li>
            <li>The table will be created with <strong>Row Level Security (RLS)</strong> enabled</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}