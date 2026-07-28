/**
 * Create Aura Task Dialog
 * Modal for creating new tasks with Aura performance tracking
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { useAuraTaskOperations } from '../src/features/aura/useAura';
import { toast } from 'sonner';

interface CreateAuraTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  projects: any[];
  onSuccess?: () => void;
}

export default function CreateAuraTaskDialog({
  open,
  onOpenChange,
  workerId,
  projects,
  onSuccess
}: CreateAuraTaskDialogProps) {
  const { create, loading } = useAuraTaskOperations();
  
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    task_type: '',
    expected_hours: '',
    hourly_rate: '15',
    difficulty: 'Medium' as 'Light' | 'Medium' | 'Heavy',
    due_date: ''
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        project_id: '',
        title: '',
        description: '',
        task_type: '',
        expected_hours: '',
        hourly_rate: '15',
        difficulty: 'Medium',
        due_date: ''
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!formData.expected_hours || parseFloat(formData.expected_hours) <= 0) {
      toast.error('Please enter valid expected hours');
      return;
    }

    try {
      await create({
        project_id: formData.project_id,
        assignee_id: workerId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        task_type: formData.task_type.trim() || undefined,
        expected_hours: parseFloat(formData.expected_hours),
        hourly_rate: parseFloat(formData.hourly_rate),
        difficulty: formData.difficulty,
        due_date: formData.due_date || undefined
      });

      toast.success('Task created successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
            Create New Task
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
            Add a task with expected hours for Aura performance tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Project *
            </Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Prime living room walls"
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="task_type" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Task Type
            </Label>
            <Select
              value={formData.task_type}
              onValueChange={(value) => setFormData({ ...formData, task_type: value })}
            >
              <SelectTrigger id="task_type">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Priming">Priming</SelectItem>
                <SelectItem value="Painting">Painting</SelectItem>
                <SelectItem value="Flooring">Flooring</SelectItem>
                <SelectItem value="Install">Install</SelectItem>
                <SelectItem value="Trim">Trim</SelectItem>
                <SelectItem value="Door">Door</SelectItem>
                <SelectItem value="Handrailing">Handrailing</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expected Hours & Hourly Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_hours" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                Expected Hours *
              </Label>
              <Input
                id="expected_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.expected_hours}
                onChange={(e) => setFormData({ ...formData, expected_hours: e.target.value })}
                placeholder="8"
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                Hourly Rate ($)
              </Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.50"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Difficulty
            </Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value: 'Light' | 'Medium' | 'Heavy') => setFormData({ ...formData, difficulty: value })}
            >
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Light">Light</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Due Date
            </Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this task..."
              rows={3}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Estimated Base Pay */}
          {formData.expected_hours && parseFloat(formData.expected_hours) > 0 && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                Estimated Base Pay
              </p>
              <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>
                ${(parseFloat(formData.expected_hours) * parseFloat(formData.hourly_rate)).toFixed(2)}
              </p>
              <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                Potential bonus up to ${((parseFloat(formData.expected_hours) * parseFloat(formData.hourly_rate)) * 0.20).toFixed(2)} (20%)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={loading}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
