/**
 * Payroll Summary Screen
 * View all worker pay summaries for current pay period
 */

import { useState, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Star,
  Download,
  Calendar,
  Award
} from 'lucide-react';
import { useAllAuraSummaries, useCurrentPayPeriod } from '../src/features/aura/useAura';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PayrollSummaryProps {
  teamMembers: any[];
}

export default function PayrollSummary({ teamMembers }: PayrollSummaryProps) {
  const { summaries, loading, refetch } = useAllAuraSummaries();
  const { payPeriod } = useCurrentPayPeriod();

  const [sortBy, setSortBy] = useState<'name' | 'pay' | 'aura' | 'tasks'>('pay');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Merge summaries with team member info
  const payrollData = useMemo(() => {
    const data = summaries.map(summary => {
      const member = teamMembers.find(m => m.id === summary.worker_id);
      return {
        ...summary,
        worker_name: member?.name || 'Unknown Worker',
        worker_role: member?.role || 'Worker'
      };
    });

    // Sort
    return data.sort((a, b) => {
      let compareA, compareB;

      switch (sortBy) {
        case 'name':
          compareA = a.worker_name.toLowerCase();
          compareB = b.worker_name.toLowerCase();
          break;
        case 'pay':
          compareA = a.total_final_pay;
          compareB = b.total_final_pay;
          break;
        case 'aura':
          compareA = a.total_aura_points;
          compareB = b.total_aura_points;
          break;
        case 'tasks':
          compareA = a.total_tasks;
          compareB = b.total_tasks;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  }, [summaries, teamMembers, sortBy, sortOrder]);

  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, summary) => ({
        total_workers: acc.total_workers + 1,
        total_tasks: acc.total_tasks + summary.total_tasks,
        total_base_pay: acc.total_base_pay + (summary.total_base_pay || 0),
        total_bonus: acc.total_bonus + (summary.total_bonus || 0),
        total_penalty: acc.total_penalty + (summary.total_penalty || 0),
        total_final_pay: acc.total_final_pay + (summary.total_final_pay || 0),
        total_aura_points: acc.total_aura_points + (summary.total_aura_points || 0)
      }),
      {
        total_workers: 0,
        total_tasks: 0,
        total_base_pay: 0,
        total_bonus: 0,
        total_penalty: 0,
        total_final_pay: 0,
        total_aura_points: 0
      }
    );
  }, [summaries]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    toast.info('Export functionality coming soon');
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'MM/dd/yyyy');
    } catch {
      return '';
    }
  };

  const getAuraColor = (points: number) => {
    if (points > 0) return 'var(--success)';
    if (points < 0) return 'var(--destructive)';
    return 'var(--muted-foreground)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h1)', 
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: '8px'
          }}>
            Payroll Summary
          </h2>
          {payPeriod && (
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--muted-foreground)' }} />
              <p style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)', 
                color: 'var(--muted-foreground)' 
              }}>
                Pay Period: {formatDate(payPeriod.period_start)} - {formatDate(payPeriod.period_end)}
              </p>
            </div>
          )}
        </div>

        <Button 
          onClick={handleExport}
          variant="outline"
          style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Totals Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Total Payable
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h1)', 
            fontWeight: 'var(--font-weight-extrabold)' 
          }}>
            ${totals.total_final_pay.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star size={18} style={{ color: 'var(--accent)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Total Tasks
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h1)', 
            fontWeight: 'var(--font-weight-extrabold)' 
          }}>
            {totals.total_tasks}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} style={{ color: 'var(--success)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Total Bonuses
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h1)', 
            fontWeight: 'var(--font-weight-extrabold)',
            color: 'var(--success)'
          }}>
            +${totals.total_bonus.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} style={{ color: 'var(--accent)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Total Aura
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h1)', 
            fontWeight: 'var(--font-weight-extrabold)',
            color: getAuraColor(totals.total_aura_points)
          }}>
            {totals.total_aura_points > 0 ? '+' : ''}{totals.total_aura_points}
          </p>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}
                >
                  Worker {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 text-center"
                  onClick={() => handleSort('tasks')}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}
                >
                  Tasks {sortBy === 'tasks' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Base Pay
                </TableHead>
                <TableHead style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Bonus
                </TableHead>
                <TableHead style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Penalty
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('pay')}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}
                >
                  Final Pay {sortBy === 'pay' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 text-center"
                  onClick={() => handleSort('aura')}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}
                >
                  Aura {sortBy === 'aura' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>
                      Loading payroll data...
                    </p>
                  </TableCell>
                </TableRow>
              ) : payrollData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>
                      No finalized tasks this pay period
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                payrollData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                          {row.worker_name}
                        </p>
                        <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                          {row.worker_role}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                        {row.total_tasks}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                      ${(row.total_base_pay || 0).toFixed(2)}
                    </TableCell>
                    <TableCell style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--success)' }}>
                      +${(row.total_bonus || 0).toFixed(2)}
                    </TableCell>
                    <TableCell style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--destructive)' }}>
                      -${(row.total_penalty || 0).toFixed(2)}
                    </TableCell>
                    <TableCell style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>
                      ${(row.total_final_pay || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span style={{ 
                        fontFamily: 'var(--font-family-heading)', 
                        fontSize: 'var(--text-h3)', 
                        fontWeight: 'var(--font-weight-bold)',
                        color: getAuraColor(row.total_aura_points || 0)
                      }}>
                        {(row.total_aura_points || 0) > 0 ? '+' : ''}{row.total_aura_points || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
