import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function SchemaInspector() {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspectSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/diagnostic/schema-check`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to inspect schema');
      }
      
      setSchema(data);
      console.log('📊 Schema Data:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Schema inspection error:', err);
    } finally {
      setLoading(false);
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
          Database Schema Inspector
        </CardTitle>
        <CardDescription
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Check if the project_transactions table exists and is configured correctly
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={inspectSchema} 
          disabled={loading}
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {loading ? 'Inspecting...' : 'Inspect project_transactions Table'}
        </Button>
        
        {error && (
          <div 
            className="p-4 rounded-lg border border-destructive bg-destructive/10"
            style={{ 
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <AlertCircle className="inline-block mr-2 h-4 w-4 text-destructive" />
            Error: {error}
          </div>
        )}
        
        {schema && (
          <div className="space-y-4">
            {/* Table Status */}
            <div 
              className={`p-4 rounded-lg border ${
                schema.tableExists 
                  ? 'border-success bg-success/10' 
                  : 'border-destructive bg-destructive/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {schema.tableExists ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 
                    style={{ 
                      fontFamily: 'var(--font-family-heading)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      marginBottom: 'var(--spacing-2)'
                    }}
                  >
                    {schema.tableExists ? '✅ Table Exists!' : '❌ Table Not Found'}
                  </h4>
                  <p 
                    style={{ 
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--text-sm)',
                      marginBottom: 'var(--spacing-3)'
                    }}
                  >
                    {schema.hint}
                  </p>
                  
                  {!schema.tableExists && (
                    <div 
                      className="mt-4 p-3 rounded border border-warning bg-warning/10"
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <h5 
                        style={{ 
                          fontWeight: 'var(--font-weight-bold)',
                          marginBottom: 'var(--spacing-2)'
                        }}
                      >
                        📋 Setup Instructions:
                      </h5>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open your Supabase Dashboard</li>
                        <li>Go to <strong>SQL Editor</strong></li>
                        <li>Click <strong>New Query</strong></li>
                        <li>Copy the contents of <code className="bg-background px-1 rounded">/supabase/migrations/create_project_transactions.sql</code></li>
                        <li>Paste it into the SQL Editor</li>
                        <li>Click <strong>Run</strong></li>
                        <li>Come back here and click "Inspect" again to verify</li>
                      </ol>
                      
                      <div 
                        className="mt-3 p-2 bg-background rounded"
                        style={{ fontSize: 'var(--text-xs)' }}
                      >
                        <strong>SQL File Location:</strong><br />
                        <code>/supabase/migrations/create_project_transactions.sql</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Column Information */}
            {schema.tableExists && schema.columns && schema.columns.length > 0 && (
              <div>
                <h4 
                  style={{ 
                    fontFamily: 'var(--font-family-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    marginBottom: 'var(--spacing-2)'
                  }}
                >
                  Table Columns:
                </h4>
                <pre 
                  className="p-3 bg-muted rounded overflow-auto"
                  style={{ 
                    fontFamily: "'Roboto Mono', monospace",
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {JSON.stringify(schema.columns, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Error Information */}
            {(schema.schemaError || schema.tableError) && (
              <div>
                <h4 
                  style={{ 
                    fontFamily: 'var(--font-family-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    marginBottom: 'var(--spacing-2)'
                  }}
                >
                  Diagnostic Messages:
                </h4>
                <div className="space-y-2">
                  {schema.schemaError && (
                    <div 
                      className="p-2 bg-muted rounded"
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <strong>Schema Error:</strong> {schema.schemaError}
                    </div>
                  )}
                  {schema.tableError && (
                    <div 
                      className="p-2 bg-muted rounded"
                      style={{ 
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <strong>Table Error:</strong> {schema.tableError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}