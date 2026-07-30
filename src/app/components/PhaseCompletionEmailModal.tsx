import { useState, useEffect } from "react";
import { X, Mail, Plus, Loader2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { createClient } from "../utils/supabase/client.tsx";

const supabase = createClient();

type MessageTemplateKey = "standard" | "ahead_of_schedule" | "delayed" | "final_phase";

const MESSAGE_TEMPLATES: { key: MessageTemplateKey; label: string }[] = [
  { key: "standard", label: "Standard update" },
  { key: "ahead_of_schedule", label: "Ahead of schedule" },
  { key: "delayed", label: "Delayed / issues encountered" },
  { key: "final_phase", label: "Final phase — project complete" },
];

interface PhaseCompletionEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectLocation?: string;
  phaseName: string;
  previousPhase?: string;
  /** Titles of tasks completed within this phase, for the "completed work" section. */
  completedTaskTitles?: string[];
  /** Name of the phase that starts next, if any. */
  nextPhaseName?: string;
  /** Free-text outstanding issues/blockers -- e.g. rejected QC notes. Falls back to "None at this time." */
  outstandingIssues?: string;
  clientEmail?: string;
  projectId: number;
  /** Record this notification in the project's activity history once sent. */
  currentUserId?: string;
}

// Recipient memory is scoped per project -- an email added once for a given
// project keeps showing up as a suggestion for that project specifically,
// rather than bleeding into every other project's recipient list.
function historyKey(projectId: number): string {
  return `phase_completion_email_history_${projectId}`;
}

function getEmailHistory(projectId: number): string[] {
  try {
    const stored = localStorage.getItem(historyKey(projectId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading email history:", error);
    return [];
  }
}

function saveEmailToHistory(projectId: number, email: string) {
  try {
    const history = getEmailHistory(projectId);
    // Add to beginning if not already present
    if (!history.includes(email)) {
      const updatedHistory = [email, ...history].slice(0, 20); // Keep last 20 emails
      localStorage.setItem(historyKey(projectId), JSON.stringify(updatedHistory));
    }
  } catch (error) {
    console.error("Error saving email to history:", error);
  }
}

export default function PhaseCompletionEmailModal({
  open,
  onOpenChange,
  projectName,
  projectLocation,
  phaseName,
  previousPhase,
  completedTaskTitles,
  nextPhaseName,
  outstandingIssues,
  clientEmail,
  projectId: projId,
  currentUserId,
}: PhaseCompletionEmailModalProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [templateKey, setTemplateKey] = useState<MessageTemplateKey>("standard");
  const [isSending, setIsSending] = useState(false);
  const [emailHistory, setEmailHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<string[]>([]);

  const buildMessage = (key: MessageTemplateKey) => {
    const projectReference = projectLocation || projectName || "your";
    const completedDate = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const completedWorkLines = completedTaskTitles && completedTaskTitles.length > 0
      ? completedTaskTitles.map((t) => `  - ${t}`).join("\n")
      : "  - All required work for this phase";
    const nextUpLine = nextPhaseName ? `Next up: ${nextPhaseName}` : "This was the final phase of the project.";
    const issuesLine = outstandingIssues && outstandingIssues.trim() ? outstandingIssues : "None at this time.";
    const phaseHeader = `${previousPhase ? `• Previous Phase: ${previousPhase}\n` : ''}• Completed Phase: ${phaseName}\n• Completed on: ${completedDate}`;

    switch (key) {
      case "ahead_of_schedule":
        return `Hello,

Good news -- we're ahead of schedule on your ${projectReference} project.

${phaseHeader}

Completed work:
${completedWorkLines}

${nextUpLine}

Outstanding issues: ${issuesLine}

Given the pace so far, we're optimistic about staying ahead through the rest of the project. Let us know if you have any questions.

Best regards,
Cstle Livn`;

      case "delayed":
        return `Hello,

We wanted to give you an update on your ${projectReference} project.

${phaseHeader}

Completed work:
${completedWorkLines}

${nextUpLine}

Outstanding issues: ${issuesLine}

This phase took longer than originally planned. We're taking steps to keep the rest of the schedule on track and will keep you posted on any further impact to the overall timeline. Please reach out if you'd like to discuss.

Best regards,
Cstle Livn`;

      case "final_phase":
        return `Hello,

We're excited to let you know we've completed the final phase of your ${projectReference} project.

${phaseHeader}

Completed work:
${completedWorkLines}

Outstanding issues: ${issuesLine}

We'll be in touch shortly to schedule a final walkthrough and handover. Thank you for the opportunity to work on this project.

Best regards,
Cstle Livn`;

      case "standard":
      default:
        return `Hello,

Great news! We've completed another phase of your ${projectReference} project.

${phaseHeader}

Completed work:
${completedWorkLines}

${nextUpLine}

Outstanding issues: ${issuesLine}

Our team is making excellent progress. If you have any questions or would like further details, please let us know.

Best regards,
Cstle Livn`;
    }
  };

  // Initialize recipients and message when modal opens
  useEffect(() => {
    if (open) {
      // Set initial recipients
      const initialRecipients: string[] = [];
      if (clientEmail && clientEmail.trim()) {
        initialRecipients.push(clientEmail);
      }
      setRecipients(initialRecipients);
      setTemplateKey("standard");
      setMessage(buildMessage("standard"));
    }
  }, [open, phaseName, previousPhase, clientEmail, projectName, projectLocation, completedTaskTitles, nextPhaseName, outstandingIssues]);

  const handleTemplateChange = (key: MessageTemplateKey) => {
    setTemplateKey(key);
    setMessage(buildMessage(key));
  };

  const handleAddRecipient = () => {
    const email = newRecipient.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (recipients.includes(email)) {
      toast.error("This email is already in the recipients list");
      return;
    }

    setRecipients([...recipients, email]);
    setNewRecipient("");
    toast.success("Recipient added");
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
    toast.success("Recipient removed");
  };

  // Load email history on open
  useEffect(() => {
    if (open) {
      const history = getEmailHistory(projId);
      setEmailHistory(history);
      setFilteredHistory(history);
    }
  }, [open, projId]);

  // Filter history based on input
  useEffect(() => {
    if (newRecipient.trim()) {
      const query = newRecipient.toLowerCase();
      setFilteredHistory(
        emailHistory.filter((email) => 
          email.toLowerCase().includes(query) && !recipients.includes(email)
        )
      );
      setShowHistory(filteredHistory.length > 0);
    } else {
      setFilteredHistory(emailHistory.filter((email) => !recipients.includes(email)));
      setShowHistory(false);
    }
  }, [newRecipient, emailHistory, recipients]);

  // Add email from history
  const handleAddFromHistory = (email: string) => {
    if (recipients.includes(email)) {
      toast.error("This email is already in the recipients list");
      return;
    }
    setRecipients([...recipients, email]);
    setNewRecipient("");
    setShowHistory(false);
    toast.success("Recipient added");
  };

  // Save recipients to history when email is sent
  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            recipients,
            subject: `Phase Completed: ${phaseName} - ${projectName}`,
            message,
            projectId: projId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      // Save all recipients to history
      recipients.forEach((email) => saveEmailToHistory(projId, email));

      // Record the notification in the project's activity history
      try {
        await supabase.from("project_activity_log").insert({
          project_id: projId,
          user_id: currentUserId || null,
          action: "phase_completion_notification_sent",
          new_value: { phaseName, recipients, previousPhase, nextPhaseName },
        });
      } catch (logError) {
        // Don't block the success path on activity logging -- the email
        // already sent, so surfacing this as a failure would be misleading.
        console.error("Failed to record activity log for phase notification:", logError);
      }

      toast.success(`Email sent to ${recipients.length} recipient(s)`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px] flex items-center gap-[8px]">
            <Mail className="w-4 h-4" />
            Send Phase Completion Update
          </DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] font-normal text-[12px] text-muted-foreground">
            Send an email to notify recipients about the completion of a project phase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[20px]">
          {/* Project Info */}
          <div className="bg-card border border-border rounded-[8px] p-[12px]">
            <p className="font-['Roboto_Mono'] font-medium text-[11px] text-muted-foreground">
              Project: <span className="text-foreground">{projectName}</span>
            </p>
            {projectLocation && (
              <p className="font-['Roboto_Mono'] font-medium text-[11px] text-muted-foreground">
                Location: <span className="text-foreground">{projectLocation}</span>
              </p>
            )}
            <p className="font-['Roboto_Mono'] font-medium text-[11px] text-muted-foreground">
              Completed Phase: <span className="text-success">{phaseName}</span>
            </p>
          </div>

          {/* Message Template */}
          <div>
            <Label className="font-['Roboto_Mono'] font-medium text-[12px] text-foreground mb-[8px] block">
              Template
            </Label>
            <Select value={templateKey} onValueChange={(v) => handleTemplateChange(v as MessageTemplateKey)}>
              <SelectTrigger className="w-full h-[36px] font-['Roboto_Mono'] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TEMPLATES.map((t) => (
                  <SelectItem key={t.key} value={t.key} className="font-['Roboto_Mono'] text-[12px]">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[4px]">
              Switching templates replaces the message below -- edit freely after choosing.
            </p>
          </div>

          {/* Recipients */}
          <div>
            <Label className="font-['Roboto_Mono'] font-medium text-[12px] text-foreground mb-[8px] block">
              Recipients
            </Label>
            
            {/* Add Recipient Input with Autocomplete */}
            <div className="relative">
              <div className="flex gap-[8px] mb-[12px]">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  onFocus={() => {
                    if (emailHistory.length > 0) {
                      setShowHistory(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow clicking on suggestions
                    setTimeout(() => setShowHistory(false), 200);
                  }}
                  placeholder="Enter email address..."
                  className="flex-1 h-[36px] bg-white border-[#858585] font-['Roboto_Mono'] text-[12px]"
                />
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="h-[36px] px-[12px] bg-accent text-accent-foreground rounded-[6px] hover:opacity-90 transition-opacity flex items-center gap-[6px]"
                >
                  <Plus className="w-3 h-3" />
                  <span className="font-['Roboto_Mono'] font-medium text-[12px]">Add</span>
                </button>
              </div>

              {/* Email History Dropdown */}
              {showHistory && filteredHistory.length > 0 && (
                <div className="absolute top-[44px] left-0 right-[80px] max-h-[160px] overflow-y-auto bg-white border border-border rounded-[6px] shadow-lg z-10">
                  <div className="p-[4px]">
                    <div className="flex items-center gap-[6px] px-[8px] py-[4px] mb-[4px]">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase">
                        Recent Emails
                      </span>
                    </div>
                    {filteredHistory.map((email) => (
                      <button
                        key={email}
                        type="button"
                        onClick={() => handleAddFromHistory(email)}
                        className="w-full flex items-center justify-between px-[10px] py-[6px] hover:bg-accent/10 rounded-[4px] transition-colors group"
                      >
                        <span className="font-['Roboto_Mono'] text-[11px] text-foreground">{email}</span>
                        <Plus className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recipients List */}
            {recipients.length > 0 ? (
              <div className="flex flex-wrap gap-[8px]">
                {recipients.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-[6px] px-[10px] py-[6px] bg-accent/10 text-accent rounded-[6px] group"
                  >
                    <span className="font-['Roboto_Mono'] text-[11px]">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
                No recipients added yet
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message" className="font-['Roboto_Mono'] font-medium text-[12px] text-foreground mb-[8px] block">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="w-full bg-white border-[#858585] font-['Roboto_Mono'] text-[12px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-[8px] justify-end pt-[12px] border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-normal text-[12px] text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending || recipients.length === 0 || !message.trim()}
              className="px-[16px] py-[8px] bg-[#748b7b] text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-bold text-[12px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-[8px]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}