/**
 * Aura Task List Component
 * Displays tasks grouped by status with actions
 */

import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  Flag, 
  Star,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { AuraTask } from '../src/features/aura/api';
import { format } from 'date-fns';
import FinalizeTaskDialog from './FinalizeTaskDialog';
import { useAuth } from './AuthContext';

interface AuraTaskListProps {
  tasks: AuraTask[];
  projects: any[];
  onTaskUpdate?: () => void;
}

export default function AuraTaskList({ tasks, projects, onTaskUpdate }: AuraTaskListProps) {
  const { user, hasPermission } = useAuth();
  const [finalizeDialogTask, setFinalizeDialogTask] = useState<any>(null);

  const isQC = hasPermission('qc') || hasPermission('admin');

  // Group tasks by status
  const groupedTasks = {
    Planned: tasks.filter(t => t.status === 'Planned'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    Completed: tasks.filter(t => t.status === 'Completed'),
    Finalized: tasks.filter(t => t.status === 'Finalized')
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.title || 'Unknown Project';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'var(--muted-foreground)';
      case 'In Progress': return 'var(--accent)';
      case 'Completed': return 'var(--success)';
      case 'Finalized': return 'var(--primary)';
      default: return 'var(--muted-foreground)';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    const color = 
      difficulty === 'Heavy' ? 'var(--destructive)' :
      difficulty === 'Medium' ? 'var(--warning)' :
      'var(--success)';
    return <Flag size={14} style={{ color }} />;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'MM/dd/yyyy');
    } catch {
      return '';
    }
  };

  const renderTask = (task: AuraTask) => (
    <Card 
      key={task.id} 
      className="p-4 hover:shadow-md transition-shadow"
      style={{ border: '1px solid var(--border)' }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontSize: 'var(--text-h3)', 
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: '4px'
            }}>
              {task.title}
            </h4>
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              color: 'var(--muted-foreground)' 
            }}>
              {getProjectName(task.project_id)}
            </p>
          </div>

          <Badge 
            variant="outline" 
            style={{ 
              backgroundColor: `${getStatusColor(task.status)}15`,
              borderColor: getStatusColor(task.status),
              color: getStatusColor(task.status),
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-label)'
            }}
          >
            {task.status}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {task.task_type && (
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                Type:
              </span>
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                {task.task_type}
              </span>
            </div>
          )}

          {task.difficulty && (
            <div className="flex items-center gap-2">
              {getDifficultyIcon(task.difficulty)}
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                {task.difficulty}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
              {task.expected_hours} hrs expected
            </span>
          </div>

          {task.actual_hours && (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                {task.actual_hours} hrs actual
              </span>
            </div>
          )}

          {task.due_date && (
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                Due {formatDate(task.due_date)}
              </span>
            </div>
          )}
        </div>

        {/* Finalized Details */}
        {task.status === 'Finalized' && (
          <div 
            className="rounded p-3 space-y-2"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={16} fill="#EAB308" stroke="#EAB308" />
                <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                  {task.quality_rating}/5 Quality
                </span>
              </div>

              {task.efficiency_ratio && (
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} style={{ color: task.efficiency_ratio > 1 ? 'var(--success)' : 'var(--destructive)' }} />
                  <span style={{ 
                    fontFamily: 'var(--font-family-body)', 
                    fontSize: 'var(--text-label)',
                    color: task.efficiency_ratio > 1 ? 'var(--success)' : 'var(--destructive)'
                  }}>
                    {(task.efficiency_ratio * 100).toFixed(0)}% Eff.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>
                  Final Pay
                </p>
                <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)' }}>
                  ${task.final_task_pay?.toFixed(2)}
                </p>
              </div>

              <div className="text-right">
                <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)' }}>
                  Aura Points
                </p>
                <p style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontSize: 'var(--text-h3)', 
                  fontWeight: 'var(--font-weight-bold)',
                  color: (task.aura_points || 0) > 0 ? 'var(--success)' : (task.aura_points || 0) < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'
                }}>
                  {(task.aura_points || 0) > 0 ? '+' : ''}{task.aura_points || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {task.status === 'Completed' && isQC && (
          <Button
            size="sm"
            onClick={() => setFinalizeDialogTask(task)}
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Finalize Task
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        {(['Planned', 'In Progress', 'Completed', 'Finalized'] as const).map((status) => {
          const statusTasks = groupedTasks[status];
          if (statusTasks.length === 0) return null;

          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                {status === 'Planned' && <Clock size={18} style={{ color: 'var(--muted-foreground)' }} />}
                {status === 'In Progress' && <PlayCircle size={18} style={{ color: 'var(--accent)' }} />}
                {status === 'Completed' && <CheckCircle size={18} style={{ color: 'var(--success)' }} />}
                {status === 'Finalized' && <Star size={18} style={{ color: 'var(--primary)' }} />}
                
                <h3 style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontSize: 'var(--text-h3)', 
                  fontWeight: 'var(--font-weight-bold)' 
                }}>
                  {status} ({statusTasks.length})
                </h3>
              </div>

              <div className="space-y-2">
                {statusTasks.map(renderTask)}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-base)', 
              color: 'var(--muted-foreground)' 
            }}>
              No tasks yet. Create your first task to get started!
            </p>
          </div>
        )}
      </div>

      {/* Finalize Dialog */}
      <FinalizeTaskDialog
        open={!!finalizeDialogTask}
        onOpenChange={(open) => !open && setFinalizeDialogTask(null)}
        task={finalizeDialogTask}
        finalizedBy={user?.id}
        onSuccess={() => {
          setFinalizeDialogTask(null);
          onTaskUpdate?.();
        }}
      />
    </>
  );
}
