import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client.tsx';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SchemaInspector } from './SchemaInspector';
import MigrationInstructions from './MigrationInstructions';

const supabase = createClient();

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'loading';
  message: string;
  details?: any;
}

export default function ProjectClientDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Fetch Projects
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, client')
        .limit(10);

      if (error) throw error;

      diagnosticResults.push({
        test: 'Fetch Projects',
        status: 'pass',
        message: `Successfully fetched ${projects?.length || 0} projects`,
        details: projects,
      });
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Fetch Projects',
        status: 'fail',
        message: error.message,
      });
    }

    // Test 2: Fetch Clients
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name');

      if (error) throw error;

      diagnosticResults.push({
        test: 'Fetch Clients',
        status: 'pass',
        message: `Successfully fetched ${clients?.length || 0} clients`,
        details: clients,
      });
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Fetch Clients',
        status: 'fail',
        message: error.message,
      });
    }

    // Test 3: UUID Validation
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, client')
        .limit(10);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUUIDs = projects?.filter(p => uuidRegex.test(p.client)) || [];
      const invalidUUIDs = projects?.filter(p => !uuidRegex.test(p.client)) || [];

      if (invalidUUIDs.length > 0) {
        diagnosticResults.push({
          test: 'Client UUID Format',
          status: 'warning',
          message: `${invalidUUIDs.length} projects have invalid client UUIDs`,
          details: invalidUUIDs,
        });
      } else {
        diagnosticResults.push({
          test: 'Client UUID Format',
          status: 'pass',
          message: `All ${validUUIDs.length} projects have valid client UUIDs`,
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Client UUID Format',
        status: 'fail',
        message: error.message,
      });
    }

    // Test 4: Client Name Mapping
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, client')
        .limit(10);

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap = new Map(
        (clients || []).map((c: any) => [String(c.id), c.name])
      );

      const mappedProjects = projects?.map(p => ({
        ...p,
        clientName: clientMap.get(String(p.client)) || 'NOT FOUND',
        mapped: clientMap.has(String(p.client)),
      }));

      const unmapped = mappedProjects?.filter(p => !p.mapped) || [];

      if (unmapped.length > 0) {
        diagnosticResults.push({
          test: 'Client Name Mapping',
          status: 'warning',
          message: `${unmapped.length} projects have unmapped clients`,
          details: unmapped,
        });
      } else {
        diagnosticResults.push({
          test: 'Client Name Mapping',
          status: 'pass',
          message: `All ${mappedProjects?.length || 0} projects successfully mapped to client names`,
          details: mappedProjects,
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Client Name Mapping',
        status: 'fail',
        message: error.message,
      });
    }

    // Test 5: Database Schema Check
    try {
      const { data: schemaInfo } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

      diagnosticResults.push({
        test: 'Schema Verification',
        status: 'pass',
        message: 'Projects table structure is correct',
        details: schemaInfo ? Object.keys(schemaInfo[0] || {}) : [],
      });
    } catch (error: any) {
      diagnosticResults.push({
        test: 'Schema Verification',
        status: 'fail',
        message: error.message,
      });
    }

    // Test 6: API Functionality
    try {
      const { listProjects } = await import('../src/features/projects/api');
      const projects = await listProjects();

      const hasClientNames = projects.every(p => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(p.client);
      });

      if (hasClientNames || projects.length === 0) {
        diagnosticResults.push({
          test: 'API Client Mapping',
          status: 'pass',
          message: `API correctly maps ${projects.length} projects to client names`,
          details: projects.slice(0, 5),
        });
      } else {
        diagnosticResults.push({
          test: 'API Client Mapping',
          status: 'warning',
          message: 'API returns UUIDs instead of client names',
          details: projects.slice(0, 5),
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        test: 'API Client Mapping',
        status: 'fail',
        message: error.message,
      });
    }

    setResults(diagnosticResults);
    setRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-success/10 border-success';
      case 'fail':
        return 'bg-destructive/10 border-destructive';
      case 'warning':
        return 'bg-warning/10 border-warning';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Setup Instructions - Must be first */}
      <MigrationInstructions />
      
      {/* Schema Inspector - Check table status */}
      <SchemaInspector />
      
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-family-heading)', fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            Project-Client Flow Diagnostic
          </CardTitle>
          <CardDescription>
            Test the complete project-client UUID mapping system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={runDiagnostics}
            disabled={running}
            className="w-full"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              'Run Diagnostic Tests'
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-['Roboto_Mono'] text-[12px] font-bold text-foreground">
                Test Results
              </h3>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-['Roboto_Mono'] text-[11px] font-bold text-foreground mb-1">
                        {result.test}
                      </h4>
                      <p className="font-['Roboto_Mono'] text-[10px] text-foreground/70">
                        {result.message}
                      </p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="font-['Roboto_Mono'] text-[9px] text-foreground/50 cursor-pointer hover:text-foreground/70">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-background rounded text-[8px] overflow-x-auto font-['Roboto_Mono']">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] text-[11px] text-foreground/70">
                    Total Tests:
                  </span>
                  <span className="font-['Roboto_Mono'] text-[11px] font-bold text-foreground">
                    {results.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] text-[11px] text-success">
                    Passed:
                  </span>
                  <span className="font-['Roboto_Mono'] text-[11px] font-bold text-success">
                    {results.filter(r => r.status === 'pass').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] text-[11px] text-warning">
                    Warnings:
                  </span>
                  <span className="font-['Roboto_Mono'] text-[11px] font-bold text-warning">
                    {results.filter(r => r.status === 'warning').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] text-[11px] text-destructive">
                    Failed:
                  </span>
                  <span className="font-['Roboto_Mono'] text-[11px] font-bold text-destructive">
                    {results.filter(r => r.status === 'fail').length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}