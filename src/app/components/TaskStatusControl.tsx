import { CheckCircle2, Clock, AlertCircle, Circle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { ALL_TASK_STATUSES, getEmployeeActions, type TaskStatus } from "../src/features/tasks/statusWorkflow";

export function getTaskStatusIcon(status: TaskStatus, className = "w-4 h-4") {
  switch (status) {
    case "Completed":
      return <CheckCircle2 className={`${className} text-success`} />;
    case "In Progress":
      return <Clock className={`${className} text-accent`} />;
    case "Under Review":
      return <AlertCircle className={`${className} text-warning`} />;
    case "Pending QC":
      return <ShieldCheck className={`${className} text-primary`} />;
    default:
      return <Circle className={`${className} text-muted-foreground`} />;
  }
}

interface TaskStatusControlProps {
  status: TaskStatus;
  /** Owns the task (assignee) or has general manager/admin edit rights. */
  canEdit: boolean;
  /** Super Admin / Admin / Manager / Quality Control -- can clear an Under
   *  Review block and approve/reject out of Pending QC. */
  canApproveQC: boolean;
  onChange: (status: TaskStatus) => Promise<void> | void;
  triggerClassName?: string;
  iconSize?: string;
}

const DEFAULT_TRIGGER_CLASS =
  "w-[40px] h-[32px] p-0 justify-center border border-transparent bg-transparent shadow-none [&>svg]:hidden rounded-[6px] cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors";

export default function TaskStatusControl({
  status,
  canEdit,
  canApproveQC,
  onChange,
  triggerClassName,
  iconSize,
}: TaskStatusControlProps) {
  const handleChange = async (value: string) => {
    try {
      await onChange(value as TaskStatus);
      toast.success("Task status updated");
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const triggerCls = triggerClassName ?? DEFAULT_TRIGGER_CLASS;

  // QC-capable users get full control over the status -- picking "Completed"
  // from Pending QC is the approval, picking "In Progress" from Pending QC
  // is a reject/send-back, and clearing "Under Review" back to "In Progress"
  // is the supervisor unblocking the task. No separate approve/reject UI is
  // needed on top of this.
  if (canApproveQC) {
    return (
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger className={triggerCls} title="Click to change status">
          {getTaskStatusIcon(status, iconSize)}
        </SelectTrigger>
        <SelectContent>
          {ALL_TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (canEdit) {
    const actions = getEmployeeActions(status);
    if (actions.length === 0) {
      return (
        <div
          title={`${status} — waiting on a supervisor or QC`}
          className="flex items-center justify-center w-[40px] h-[32px]"
        >
          {getTaskStatusIcon(status, iconSize)}
        </div>
      );
    }
    return (
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger className={triggerCls} title="Click to update status">
          {getTaskStatusIcon(status, iconSize)}
        </SelectTrigger>
        <SelectContent>
          {actions.map((a) => (
            <SelectItem key={a.nextStatus} value={a.nextStatus}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      title="You can only update tasks assigned to you"
      className="flex items-center justify-center w-[40px] h-[32px]"
    >
      {getTaskStatusIcon(status, iconSize)}
    </div>
  );
}
