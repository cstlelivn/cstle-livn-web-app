/**
 * Finalize Task Dialog
 * Single-step QC finalization with live pay calculation preview
 */

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Star, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuraTaskOperations } from '../src/features/aura/useAura';
import { calculateTaskPay } from '../src/features/aura/api';
import { toast } from 'sonner';

interface FinalizeTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    expected_hours: number;
    hourly_rate: number;
    assignee_id?: string;
  } | null;
  finalizedBy?: string;
  onSuccess?: () => void;
}

export default function FinalizeTaskDialog({
  open,
  onOpenChange,
  task,
  finalizedBy,
  onSuccess
}: FinalizeTaskDialogProps) {
  const { finalize, loading } = useAuraTaskOperations();
  
  const [actualHours, setActualHours] = useState('');
  const [qualityRating, setQualityRating] = useState<number | null>(null);
  const [reworkHours, setReworkHours] = useState('0');
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens with new task
  useEffect(() => {
    if (open && task) {
      setActualHours('');
      setQualityRating(null);
      setReworkHours('0');
      setNotes('');
    }
  }, [open, task]);

  // Live calculation preview
  const calculations = useMemo(() => {
    if (!task || !actualHours || qualityRating === null) return null;

    const actual = parseFloat(actualHours);
    const rework = parseFloat(reworkHours) || 0;

    if (actual <= 0) return null;

    return calculateTaskPay(
      task.expected_hours,
      actual,
      task.hourly_rate,
      qualityRating,
      rework
    );
  }, [task, actualHours, qualityRating, reworkHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task) return;

    // Validation
    if (!actualHours || parseFloat(actualHours) <= 0) {
      toast.error('Please enter valid actual hours');
      return;
    }
    if (qualityRating === null) {
      toast.error('Please select a quality rating');
      return;
    }

    try {
      await finalize(
        task.id,
        parseFloat(actualHours),
        qualityRating,
        parseFloat(reworkHours) || 0,
        notes.trim() || undefined,
        finalizedBy
      );

      toast.success('Task finalized successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to finalize task');
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => setQualityRating(rating)}
            className="transition-all hover:scale-110"
            style={{
              color: qualityRating !== null && qualityRating >= rating ? '#EAB308' : 'var(--border)',
              fontSize: '28px'
            }}
          >
            <Star
              fill={qualityRating !== null && qualityRating >= rating ? '#EAB308' : 'none'}
              strokeWidth={2}
              size={28}
            />
          </button>
        ))}
      </div>
    );
  };

  const getAuraColor = (points: number) => {
    if (points > 0) return 'var(--success)';
    if (points < 0) return 'var(--destructive)';
    return 'var(--muted-foreground)';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
            Finalize Task
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
            {task?.title}
          </DialogDescription>
        </DialogHeader>

        {task && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Info */}
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                    Expected Hours
                  </p>
                  <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                    {task.expected_hours} hrs
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                    Hourly Rate
                  </p>
                  <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                    ${task.hourly_rate}/hr
                  </p>
                </div>
              </div>
            </div>

            {/* Actual Hours */}
            <div className="space-y-2">
              <Label htmlFor="actual_hours" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                Actual Hours Used *
              </Label>
              <Input
                id="actual_hours"
                type="number"
                step="0.5"
                min="0"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                placeholder="Enter actual hours"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>

            {/* Quality Rating */}
            <div className="space-y-2">
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                Quality Rating *
              </Label>
              {renderStars()}
              <div className="grid grid-cols-6 gap-2 mt-2">
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--destructive)' }}>0★<br/>-8%</p>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--destructive)' }}>1★<br/>-4%</p>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>2★<br/>0%</p>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--accent)' }}>3★<br/>+2%</p>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--success)' }}>4★<br/>+6%</p>
                </div>
                <div className="text-center">
                  <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--success)' }}>5★<br/>+10%</p>
                </div>
              </div>
            </div>

            {/* Rework Hours */}
            <div className="space-y-2">
              <Label htmlFor="rework_hours" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                Rework Hours Required (0-3)
              </Label>
              <Input
                id="rework_hours"
                type="number"
                step="0.5"
                min="0"
                max="3"
                value={reworkHours}
                onChange={(e) => setReworkHours(e.target.value)}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                QC Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any feedback or notes..."
                rows={3}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>

            {/* Live Preview */}
            {calculations && (
              <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: 'var(--card)', border: '2px solid var(--accent)' }}>
                <h3 style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>
                  Payment Preview
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      Base Pay
                    </p>
                    <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                      ${calculations.basePay.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      Efficiency
                    </p>
                    <div className="flex items-center gap-2">
                      {calculations.efficiencyRatio > 1 ? (
                        <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                      ) : calculations.efficiencyRatio < 1 ? (
                        <TrendingDown size={16} style={{ color: 'var(--destructive)' }} />
                      ) : null}
                      <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                        {(calculations.efficiencyRatio * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--success)' }}>
                      Bonus
                    </p>
                    <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', color: 'var(--success)' }}>
                      +${calculations.bonusAmount.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--destructive)' }}>
                      Penalty
                    </p>
                    <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', color: 'var(--destructive)' }}>
                      -${calculations.penaltyAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-end">
                    <div>
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                        Final Task Pay
                      </p>
                      <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--foreground)' }}>
                        ${calculations.finalTaskPay.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                        Aura Points
                      </p>
                      <p style={{ 
                        fontFamily: 'var(--font-family-heading)', 
                        fontSize: 'var(--text-h2)', 
                        fontWeight: 'var(--font-weight-extrabold)',
                        color: getAuraColor(calculations.auraPoints)
                      }}>
                        {calculations.auraPoints > 0 ? '+' : ''}{calculations.auraPoints}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !calculations}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  'Finalize Task'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
