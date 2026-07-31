import { useState } from "react";
import { Bell, Phone, Mail, Calendar, Clock, Check, Trash2, X, ClipboardCheck, AlertCircle, UserX } from "lucide-react";
import { useApp, type Reminder } from "./AppContext";
import { useAuth } from "./AuthContext";
import { usePendingQCCount } from "./QCReviewQueue";
import { useTasksAwaitingReview } from "../src/features/tasks/useTasksAwaitingReview";
import { useDeclinedTasksNeedingReassignment } from "../src/features/taskAssignees/useDeclinedAssignments";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

interface NotificationBellProps {
  onNavigate?: (view: string, subViewOrId?: string | number) => void;
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { reminders, completeReminder, deleteReminder, tasks } = useApp();
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pendingQCCount = usePendingQCCount();

  // Same scoped list QCReviewQueue uses -- gated by canViewQCReviewQueue and
  // limited to projects this person supervises, so Associates (and Managers
  // who don't supervise a given project) never see these, only whoever the
  // actual QC reviewer for that project is.
  const tasksNeedingAttention = useTasksAwaitingReview();

  // Declined assignments needing reassignment -- only relevant to people who
  // can actually act on it (assign someone else), same gate as the rest of
  // the team-management surface. An Associate declining their own task isn't
  // shown this list about themselves; it's for whoever needs to reassign it.
  const canReassign = hasPermission("canManageTeam");
  const { items: declinedTasks } = useDeclinedTasksNeedingReassignment(tasks, canReassign);

  // Filter for active (incomplete) reminders
  const activeReminders = reminders.filter((r) => !r.completed);

  // Separate into overdue and upcoming
  const now = new Date();
  const overdueReminders = activeReminders.filter((r) => {
    const reminderDateTime = new Date(`${r.date}T${r.time}`);
    return reminderDateTime < now;
  });

  const upcomingReminders = activeReminders.filter((r) => {
    const reminderDateTime = new Date(`${r.date}T${r.time}`);
    return reminderDateTime >= now;
  });

  // Sort by date/time
  const sortedOverdue = [...overdueReminders].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const sortedUpcoming = [...upcomingReminders].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const handleComplete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeReminder(id);
      toast.success("Reminder marked as complete");
    } catch (error) {
      toast.error("Failed to complete reminder");
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteReminder(id);
      toast.success("Reminder deleted");
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Create and append anchor to DOM for better cross-device support
    const link = document.createElement('a');
    link.href = `tel:${phone}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Create and append anchor to DOM for better cross-device support
    const link = document.createElement('a');
    link.href = `mailto:${email}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "appointment":
        return <Calendar className="w-4 h-4" />;
      case "follow-up":
        return <Clock className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateStr = "";
    if (dateObj.toDateString() === today.toDateString()) {
      dateStr = "Today";
    } else if (dateObj.toDateString() === tomorrow.toDateString()) {
      dateStr = "Tomorrow";
    } else {
      dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${dateStr} at ${timeStr}`;
  };

  const ReminderCard = ({ reminder, isOverdue }: { reminder: Reminder; isOverdue: boolean }) => (
    <div
      className={`p-[12px] rounded-[8px] border ${
        isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
      } hover:shadow-sm transition-all`}
    >
      <div className="flex items-start gap-[12px]">
        <div className={`p-[8px] rounded-[6px] ${isOverdue ? "bg-destructive/10" : "bg-accent/10"}`}>
          {getIcon(reminder.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-[8px] mb-[4px]">
            <div className="flex-1">
              <p className="font-['Roboto_Mono'] text-[11px] mb-[2px]">
                {reminder.leadName || reminder.clientName}
              </p>
              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground capitalize">
                {reminder.type}
              </p>
            </div>
            <Badge variant={isOverdue ? "destructive" : "secondary"} className="font-['Roboto_Mono'] text-[9px]">
              {isOverdue ? "Overdue" : "Upcoming"}
            </Badge>
          </div>
          
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">
            {formatDateTime(reminder.date, reminder.time)}
          </p>

          {reminder.notes && (
            <p className="font-['Roboto_Mono'] text-[10px] text-foreground/70 mb-[8px] line-clamp-2">
              {reminder.notes}
            </p>
          )}

          <div className="flex items-center gap-[8px]">
            {reminder.type === "call" && reminder.contactPhone && (
              <a
                href={`tel:${reminder.contactPhone}`}
                className="inline-flex items-center justify-center h-[28px] px-[12px] rounded-[6px] border border-border bg-background hover:bg-accent hover:text-accent-foreground font-['Roboto_Mono'] text-[9px] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3 mr-[4px]" />
                Call
              </a>
            )}
            {reminder.type === "email" && reminder.contactEmail && (
              <a
                href={`mailto:${reminder.contactEmail}`}
                className="inline-flex items-center justify-center h-[28px] px-[12px] rounded-[6px] border border-border bg-background hover:bg-accent hover:text-accent-foreground font-['Roboto_Mono'] text-[9px] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-3 h-3 mr-[4px]" />
                Email
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-[28px] px-[8px] font-['Roboto_Mono'] text-[9px]"
              onClick={(e) => handleComplete(reminder.id, e)}
            >
              <Check className="w-3 h-3 mr-[4px]" />
              Complete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-[28px] px-[8px] font-['Roboto_Mono'] text-[9px] text-destructive hover:text-destructive"
              onClick={(e) => handleDelete(reminder.id, e)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const totalNotifications = overdueReminders.length + pendingQCCount + tasksNeedingAttention.length + declinedTasks.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-[32px] w-[32px] p-0"
        >
          <Bell className="w-5 h-5" />
          {totalNotifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-[6px] py-0 flex items-center justify-center rounded-full"
            >
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-24px)] max-w-[400px] p-0" align="end">
        <div className="p-[16px] border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-['Anybody'] text-[14px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
              Notifications
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-[24px] w-[24px] p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[4px]">
            {tasksNeedingAttention.length > 0 && `${tasksNeedingAttention.length} task${tasksNeedingAttention.length !== 1 ? 's' : ''} need attention`}
            {tasksNeedingAttention.length > 0 && (pendingQCCount > 0 || activeReminders.length > 0) && " • "}
            {pendingQCCount > 0 && `${pendingQCCount} QC review${pendingQCCount !== 1 ? 's' : ''} pending`}
            {pendingQCCount > 0 && activeReminders.length > 0 && " • "}
            {activeReminders.length > 0 && `${overdueReminders.length} overdue, ${upcomingReminders.length} upcoming`}
          </p>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {activeReminders.length === 0 && pendingQCCount === 0 && tasksNeedingAttention.length === 0 && declinedTasks.length === 0 ? (
            <div className="p-[32px] text-center">
              <Bell className="w-12 h-12 mx-auto mb-[12px] text-muted-foreground/30" />
              <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
                No notifications
              </p>
              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[4px]">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="p-[16px] space-y-[16px]">
              {/* Tasks Needing Attention */}
              {tasksNeedingAttention.length > 0 && (
                <div>
                  <h4 className="font-['Roboto_Mono'] text-[10px] text-accent uppercase mb-[8px]">
                    Tasks Needing Attention ({tasksNeedingAttention.length})
                  </h4>
                  <div 
                    className="p-[12px] rounded-[8px] border bg-accent/5 border-accent/20 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => {
                      setIsOpen(false);
                      if (onNavigate) {
                        onNavigate("projects", "qc-review");
                      }
                    }}
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="p-[8px] rounded-[6px] bg-accent/10">
                        <AlertCircle className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                          {tasksNeedingAttention.filter((t) => t.status === "Under Review").length} under review • {tasksNeedingAttention.filter((t) => t.status === "Pending QC").length} pending QC
                        </p>
                        <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                          Click to view all tasks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Declined tasks needing reassignment */}
              {declinedTasks.length > 0 && (
                <div>
                  <h4 className="font-['Roboto_Mono'] text-[10px] text-destructive uppercase mb-[8px]">
                    Declined Tasks ({declinedTasks.length})
                  </h4>
                  <div className="space-y-[8px]">
                    {declinedTasks.map((item) => (
                      <div
                        key={item.id}
                        className="p-[12px] rounded-[8px] border bg-destructive/5 border-destructive/20 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => {
                          setIsOpen(false);
                          if (onNavigate) {
                            onNavigate("project-details", item.task.projectId);
                          }
                        }}
                      >
                        <div className="flex items-center gap-[12px]">
                          <div className="p-[8px] rounded-[6px] bg-destructive/10">
                            <UserX className="w-4 h-4 text-destructive" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-['Roboto_Mono'] text-[11px] text-foreground truncate">
                              {item.task.title}
                            </p>
                            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground truncate">
                              Declined{item.declineReason ? `: ${item.declineReason}` : ""} — needs reassignment
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Reviews Pending */}
              {pendingQCCount > 0 && (
                <div>
                  <h4 className="font-['Roboto_Mono'] text-[10px] text-warning uppercase mb-[8px]">
                    QC Reviews ({pendingQCCount})
                  </h4>
                  <div 
                    className="p-[12px] rounded-[8px] border bg-warning/5 border-warning/20 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => {
                      setIsOpen(false);
                      if (onNavigate) {
                        onNavigate("projects", "qc-review");
                      }
                    }}
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="p-[8px] rounded-[6px] bg-warning/10">
                        <ClipboardCheck className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-['Roboto_Mono'] text-[11px] mb-[2px]">
                          Phase QC Reviews Awaiting Approval
                        </p>
                        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                          {pendingQCCount} phase{pendingQCCount !== 1 ? 's' : ''} need{pendingQCCount === 1 ? 's' : ''} quality control review
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-['Roboto_Mono'] text-[9px]">
                        View
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {sortedOverdue.length > 0 && (
                <div>
                  <h4 className="font-['Roboto_Mono'] text-[10px] text-destructive uppercase mb-[8px]">
                    Overdue ({sortedOverdue.length})
                  </h4>
                  <div className="space-y-[8px]">
                    {sortedOverdue.map((reminder) => (
                      <ReminderCard key={reminder.id} reminder={reminder} isOverdue={true} />
                    ))}
                  </div>
                </div>
              )}

              {sortedUpcoming.length > 0 && (
                <div>
                  <h4 className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase mb-[8px]">
                    Upcoming ({sortedUpcoming.length})
                  </h4>
                  <div className="space-y-[8px]">
                    {sortedUpcoming.map((reminder) => (
                      <ReminderCard key={reminder.id} reminder={reminder} isOverdue={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}