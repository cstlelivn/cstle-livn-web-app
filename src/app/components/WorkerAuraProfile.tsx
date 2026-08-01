/**
 * Worker Aura Profile
 * Complete profile view for a team member with Aura tracking
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, User, Phone, Mail, Briefcase } from 'lucide-react';
import AuraSummaryCard from './AuraSummaryCard';
import AuraProfileCard from './AuraProfileCard';
import AuraTaskList from './AuraTaskList';
import CreateAuraTaskDialog from './CreateAuraTaskDialog';
import { useWorkerTasks, useWorkerAuraSummary } from '../src/features/aura/useAura';
import { useAuth } from './AuthContext';

interface WorkerAuraProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: {
    id: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    skills?: string;
  } | null;
  projects: any[];
}

export default function WorkerAuraProfile({
  open,
  onOpenChange,
  worker,
  projects
}: WorkerAuraProfileProps) {
  const { hasPermission } = useAuth();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { summary, loading: summaryLoading, refetch: refetchSummary } = useWorkerAuraSummary(worker?.id);
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useWorkerTasks(worker?.id);

  const canCreateTasks = hasPermission('admin') || hasPermission('manager') || hasPermission('qc');

  const handleTaskUpdate = () => {
    refetchTasks();
    refetchSummary();
  };

  if (!worker) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontSize: 'var(--text-h1)', 
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: '8px'
            }}>
              {worker.name}
            </DialogTitle>
            <DialogDescription style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-base)', 
              color: 'var(--muted-foreground)'
            }}>
              View Aura performance metrics, tasks, and pay history for {worker.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start justify-between mt-4">
            <div className="flex items-center gap-4">
              <div 
                className="flex items-center justify-center rounded-full" 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)'
                }}
              >
                <span style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontSize: 'var(--text-h2)', 
                  fontWeight: 'var(--font-weight-bold)' 
                }}>
                  {worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>

              <div>
                <div className="flex flex-col gap-1">
                  {worker.role && (
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-label)', 
                        color: 'var(--muted-foreground)' 
                      }}>
                        {worker.role}
                      </span>
                    </div>
                  )}

                  {worker.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-label)', 
                        color: 'var(--muted-foreground)' 
                      }}>
                        {worker.email}
                      </span>
                    </div>
                  )}

                  {worker.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-label)', 
                        color: 'var(--muted-foreground)' 
                      }}>
                        {worker.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canCreateTasks && (
              <Button 
                onClick={() => setCreateTaskOpen(true)}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="overview"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <AuraSummaryCard summary={summary} loading={summaryLoading} />

              {worker.skills && (
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h4 style={{ 
                    fontFamily: 'var(--font-family-heading)', 
                    fontSize: 'var(--text-h3)', 
                    fontWeight: 'var(--font-weight-bold)',
                    marginBottom: '8px'
                  }}>
                    Skills
                  </h4>
                  <p style={{ 
                    fontFamily: 'var(--font-family-body)', 
                    fontSize: 'var(--text-base)', 
                    color: 'var(--foreground)' 
                  }}>
                    {worker.skills}
                  </p>
                </div>
              )}

              {/* Recent Tasks Preview */}
              <div>
                <h4 style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontSize: 'var(--text-h3)', 
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: '12px'
                }}>
                  Recent Tasks
                </h4>
                <AuraTaskList 
                  tasks={tasks.slice(0, 3)} 
                  projects={projects}
                  onTaskUpdate={handleTaskUpdate}
                />
                {tasks.length > 3 && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('tasks')}
                    className="mt-4 w-full"
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                  >
                    View All {tasks.length} Tasks
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              <AuraProfileCard teamMemberId={String(worker.id)} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              {tasksLoading ? (
                <div className="text-center py-12">
                  <p style={{ 
                    fontFamily: 'var(--font-family-body)', 
                    fontSize: 'var(--text-base)', 
                    color: 'var(--muted-foreground)' 
                  }}>
                    Loading tasks...
                  </p>
                </div>
              ) : (
                <AuraTaskList 
                  tasks={tasks} 
                  projects={projects}
                  onTaskUpdate={handleTaskUpdate}
                />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="text-center py-12">
                <p style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)', 
                  color: 'var(--muted-foreground)' 
                }}>
                  Full Aura ledger history coming soon
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <CreateAuraTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        workerId={worker.id}
        projects={projects}
        onSuccess={handleTaskUpdate}
      />
    </>
  );
}