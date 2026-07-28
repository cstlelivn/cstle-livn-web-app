/**
 * Aura Summary Card
 * Displays worker's Aura performance stats for current pay period
 */

import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Star, TrendingUp, DollarSign, Award } from 'lucide-react';
import { AuraSummary } from '../src/features/aura/api';

interface AuraSummaryCardProps {
  summary: AuraSummary | null;
  loading?: boolean;
}

export default function AuraSummaryCard({ summary, loading }: AuraSummaryCardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Default empty state
  const data = summary || {
    total_tasks: 0,
    total_aura_points: 0,
    total_bonus: 0,
    total_penalty: 0,
    total_final_pay: 0,
    avg_quality_rating: 0,
    avg_efficiency_ratio: 0
  };

  const getAuraLevel = (points: number, tasksCount: number) => {
    if (tasksCount === 0) return { level: 'New Member', color: 'var(--muted-foreground)' };
    
    const avgRating = points / tasksCount;
    
    if (avgRating >= 4.5) return { level: 'Legendary', color: '#A78C38' };
    if (avgRating >= 3.5) return { level: 'Master', color: '#92949B' };
    if (avgRating >= 2.5) return { level: 'Expert', color: 'var(--primary)' };
    if (avgRating >= 1.5) return { level: 'Professional', color: 'var(--accent)' };
    if (avgRating >= 0.5) return { level: 'Skilled', color: 'var(--muted-foreground)' };
    return { level: 'Developing', color: 'var(--muted-foreground)' };
  };

  const auraLevel = getAuraLevel(data.total_aura_points, data.total_tasks);
  const auraColor = data.total_aura_points > 0 ? 'var(--success)' : data.total_aura_points < 0 ? 'var(--destructive)' : 'var(--muted-foreground)';

  return (
    <Card className="p-6 space-y-6" style={{ border: '2px solid var(--accent)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${auraLevel.color}20` }}>
            <Award size={24} style={{ color: auraLevel.color }} />
          </div>
          <div>
            <h3 style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontSize: 'var(--text-h3)', 
              fontWeight: 'var(--font-weight-bold)' 
            }}>
              Aura Performance
            </h3>
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: auraLevel.color,
              fontWeight: 'var(--font-weight-bold)'
            }}>
              {auraLevel.level}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-label)', 
            color: 'var(--muted-foreground)' 
          }}>
            Current Period
          </p>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-extrabold)',
            color: auraColor
          }}>
            {data.total_aura_points > 0 ? '+' : ''}{data.total_aura_points}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tasks Completed */}
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} style={{ color: 'var(--accent)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Tasks Completed
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-bold)' 
          }}>
            {data.total_tasks}
          </p>
        </div>

        {/* Avg Quality */}
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} fill="#EAB308" stroke="#EAB308" />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Avg Quality
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-bold)' 
          }}>
            {data.avg_quality_rating ? data.avg_quality_rating.toFixed(1) : '0.0'}/5
          </p>
        </div>

        {/* Avg Efficiency */}
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Avg Efficiency
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-bold)' 
          }}>
            {data.avg_efficiency_ratio ? (data.avg_efficiency_ratio * 100).toFixed(0) : '0'}%
          </p>
        </div>

        {/* Total Pay */}
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} style={{ color: 'var(--success)' }} />
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              Total Pay
            </p>
          </div>
          <p style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-bold)' 
          }}>
            ${(data.total_final_pay || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Bonus/Penalty Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-label)', 
            color: 'var(--success)' 
          }}>
            Total Bonuses
          </span>
          <span style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)', 
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--success)' 
          }}>
            +${(data.total_bonus || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-label)', 
            color: 'var(--destructive)' 
          }}>
            Total Penalties
          </span>
          <span style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)', 
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--destructive)' 
          }}>
            -${(data.total_penalty || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* No tasks message */}
      {data.total_tasks === 0 && (
        <div className="text-center py-4 rounded-lg" style={{ backgroundColor: 'var(--card)' }}>
          <p style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)', 
            color: 'var(--muted-foreground)' 
          }}>
            No finalized tasks this pay period
          </p>
        </div>
      )}
    </Card>
  );
}
