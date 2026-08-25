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
  /** Super Admin / Admin / Manager -- can clear an Under Review block and
   *  approve/reject out of Pending QC. */
  canApproveQC: boolean;
  onChange: (status: TaskStatus) => Promise<void> | void;
  triggerClassName?: string;
  iconSize?: string;
  /** Render the status text next to the icon, as a pill -- an icon alone
   *  reads as decoration, not a control, in list/grid rows. */
  showLabel?: boolean;
}

// NOTE: the Select's auto-appended chevron is always the LAST svg child, so
// hiding it must target :last-child specifically -- a bare "[&>svg]:hidden"
// hides the status icon too, since lucide icons render as a direct <svg>
// child of the trigger just like the chevron. That bug made the control
// invisible for anyone with edit rights (the read-only div branches below
// don't go through Select, so only they ever showed an icon).
const DEFAULT_TRIGGER_CLASS =
  "w-[40px] h-[32px] p-0 justify-center border border-transparent bg-transparent shadow-none [&>svg:last-child]:hidden rounded-[6px] cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors";

// w-fit is required: the base SelectTrigger ships "w-full" and tailwind-merge
// only drops it when this string supplies its own width utility -- without
// one, the trigger silently claims 100% of its flex row and crushes whatever
// sits next to it (e.g. the task title) down to zero visible width.
const LABEL_TRIGGER_CLASS =
  "w-fit h-[26px] px-[10px] gap-[6px] border border-border bg-secondary/40 shadow-none rounded-full cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors [&>svg:last-child]:opacity-60 [&>svg:last-child]:w-3 [&>svg:last-child]:h-3";

function statusTextClass(status: TaskStatus) {
  switch (status) {
    case "Completed":
      return "text-success";
    case "In Progress":
      return "text-accent";
    case "Under Review":
      return "text-warning";
    case "Pending QC":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

export default function TaskStatusControl({
  status,
  canEdit,
  canApproveQC,
  onChange,
  triggerClassName,
  iconSize,
  showLabel,
}: TaskStatusControlProps) {
  const handleChange = async (value: string) => {
    try {
      await onChange(value as TaskStatus);
      toast.success("Task status updated");
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const triggerCls = triggerClassName ?? (showLabel ? LABEL_TRIGGER_CLASS : DEFAULT_TRIGGER_CLASS);
  const readOnlyCls = showLabel
    ? "flex items-center gap-[6px] h-[26px] px-[10px] rounded-full border border-border bg-secondary/40"
    : "flex items-center justify-center w-[40px] h-[32px]";

  const content = (
    <>
      {getTaskStatusIcon(status, iconSize)}
      {showLabel && <span className={`font-['Roboto_Mono'] text-[10px] font-medium ${statusTextClass(status)}`}>{status}</span>}
    </>
  );

  // QC-capable users get full control over the status -- picking "Completed"
  // from Pending QC is the approval, picking "In Progress" from Pending QC
  // is a reject/send-back, and clearing "Under Review" back to "In Progress"
  // is the supervisor unblocking the task. No separate approve/reject UI is
  // needed on top of this.
  if (canApproveQC) {
    return (
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger className={triggerCls} title="Click to change status">
          {content}
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
        <div title={`${status} — waiting on a supervisor or QC`} className={readOnlyCls}>
          {content}
        </div>
      );
    }
    return (
      <Select value={status} onValueChange={handleChange}>
        <SelectTrigger className={triggerCls} title="Click to update status">
          {content}
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
    <div title="You can only update tasks assigned to you" className={readOnlyCls}>
      {content}
    </div>
  );
}
