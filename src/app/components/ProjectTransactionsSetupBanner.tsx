import { Button } from './ui/button';
import { createClient } from '../utils/supabase/client.tsx';

const supabase = createClient();

interface ProjectTransactionsSetupBannerProps {
  onNavigateToDiagnostic?: () => void;
}

export default function ProjectTransactionsSetupBanner({ 
  onNavigateToDiagnostic 
}: ProjectTransactionsSetupBannerProps) {
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkTableExists();
  }, []);

  const checkTableExists = async () => {
    try {
      // Try to query the table with limit 0 (fast check)
      const { error } = await supabase
        .from('project_transactions')
        .select('id')
        .limit(0);

      if (error) {
        // Check if it's a "table not found" error
        if (error.code === 'PGRST205' || 
            error.message?.includes('Could not find the table') ||
            error.message?.includes('does not exist')) {
          setTableExists(false);
        } else {
          // Other errors - assume table exists but there's a different issue
          setTableExists(true);
        }
      } else {
        setTableExists(true);
      }
    } catch (err) {
      console.error('Error checking table existence:', err);
      setTableExists(false);
    } finally {
      setChecking(false);
    }
  };

  // Don't show banner if:
  // - Still checking
  // - Table exists
  // - User dismissed it
  if (checking || tableExists === true || dismissed) {
    return null;
  }

  return (
    <div 
      className="relative border-l-4 border-warning bg-warning/10 p-4 mb-6 rounded-r-lg"
      style={{ 
        fontFamily: 'var(--font-family-body)',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded hover:bg-warning/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 space-y-3">
          <div>
            <h4 
              style={{ 
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--text-base)',
                marginBottom: 'var(--spacing-1)'
              }}
            >
              ⚙️ Setup Required: Project Transactions Database
            </h4>
            <p 
              style={{ 
                fontSize: 'var(--text-sm)',
                color: 'var(--foreground-70)'
              }}
            >
              The <code className="px-1 py-0.5 bg-background rounded">project_transactions</code> table hasn't been created yet. 
              This is a <strong>one-time setup</strong> that takes less than 2 minutes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onNavigateToDiagnostic && (
              <Button
                onClick={onNavigateToDiagnostic}
                size="sm"
                style={{ 
                  fontSize: 'var(--text-sm)',
                }}
              >
                Go to Setup Instructions
              </Button>
            )}
            
            <Button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              size="sm"
              variant="outline"
              style={{ 
                fontSize: 'var(--text-sm)',
              }}
            >
              Open Supabase Dashboard
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
            
            <Button
              onClick={checkTableExists}
              size="sm"
              variant="outline"
              style={{ 
                fontSize: 'var(--text-sm)',
              }}
            >
              Check Again
            </Button>
          </div>

          <div 
            className="text-xs p-2 bg-background rounded border border-border"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            <strong>Quick Fix:</strong> Run the SQL in <code>/supabase/migrations/create_project_transactions.sql</code> in your Supabase SQL Editor.
          </div>
        </div>
      </div>
    </div>
  );
}