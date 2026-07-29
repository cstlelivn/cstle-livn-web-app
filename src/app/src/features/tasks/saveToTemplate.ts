import { toast } from "sonner";
import { updateTaskTemplate } from "../projectTemplates/api";

/**
 * After a schedule change (Gantt drag/resize, Calendar drag) on a task that
 * was cloned from a template, offer to save the new duration back to that
 * template's task_templates row for future projects. Dismissing the toast
 * (or just not clicking the action) leaves the change scoped to this
 * project only -- nothing is written unless the user explicitly clicks it.
 */
export function offerSaveDurationToTemplate(task: { task_template_id?: string | null; title: string }, newDurationDays: number) {
  if (!task.task_template_id || newDurationDays < 1) return;

  toast("Save this new duration to the template?", {
    description: `"${task.title}" is now ${newDurationDays} day${newDurationDays === 1 ? "" : "s"}. This only affects future projects created from this template.`,
    action: {
      label: "Save to Template",
      onClick: async () => {
        try {
          await updateTaskTemplate(task.task_template_id as string, { default_duration_days: newDurationDays });
          toast.success("Template updated");
        } catch (error) {
          toast.error("Failed to update template");
        }
      },
    },
    duration: 8000,
  });
}
