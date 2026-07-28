import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { X, Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface EmailUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    type: "phase" | "status";
    oldValue: string;
    newValue: string;
  } | null;
  clientEmail: string;
  projectName?: string;
  projectLocation?: string;
}

export default function EmailUpdateModal({
  open,
  onOpenChange,
  data,
  clientEmail,
  projectName,
  projectLocation,
}: EmailUpdateModalProps) {
  const [recipients, setRecipients] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Pre-fill fields when modal opens
  useEffect(() => {
    if (open && data) {
      // Pre-fill recipient with client email if available
      setRecipients(clientEmail || "");

      // Pre-fill subject
      const changeType = data.type === "phase" ? "Phase" : "Status";
      setSubject(
        `Project Update – ${changeType} changed to ${data.newValue}`
      );

      // Pre-fill message body
      const clientGreeting = "Hello,";
      
      // Create project reference - prefer location, fallback to name
      const projectReference = projectLocation || projectName || "your";
      
      // Format the change labels
      const previousLabel = data.type === "phase" ? "Previous Phase" : "Previous Status";
      const newLabel = data.type === "phase" ? "New Completed Phase" : "New Status";
      
      setMessage(
`${clientGreeting}

This is a quick update on your ${projectReference} project.

• ${previousLabel}: ${data.oldValue}
• ${newLabel}: ${data.newValue}
• Updated on: ${new Date().toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})}

Our team is progressing according to plan. If you have any questions or would like further details, please let us know.

Best regards,
Cstle Livn`
      );
    }
  }, [open, data, clientEmail, projectName, projectLocation]);

  const handleSendEmail = async () => {
    if (!data) return;
    
    // Validate recipients
    const recipientList = recipients.split(",").map((e) => e.trim()).filter(Boolean);
    if (recipientList.length === 0) {
      toast.error("Please enter at least one recipient email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientList.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email address: ${invalidEmails.join(", ")}`);
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/projects/send-update-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            changeType: data.type,
            oldValue: data.oldValue,
            newValue: data.newValue,
            to: recipientList,
            cc: cc.split(",").map((e) => e.trim()).filter(Boolean),
            subject: subject.trim(),
            body: message.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      toast.success("Update email sent successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("❌ Error sending email:", error);
      toast.error(error.message || "Failed to send email, please try again");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-[12px]">
            <div className="w-[40px] h-[40px] rounded-[8px] bg-accent/10 flex items-center justify-center">
              <Mail className="w-[20px] h-[20px] text-accent" />
            </div>
            <div>
              <DialogTitle className="font-['Anybody']" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                Send Project Update
              </DialogTitle>
              <DialogDescription className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
                Notify client about {data?.type || "project"} change
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-[20px] mt-[24px]">
          {/* Recipients */}
          <div className="space-y-[8px]">
            <Label htmlFor="recipients" className="font-['Roboto_Mono'] text-[11px] font-medium">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipients"
              type="text"
              placeholder="client@email.com, manager@email.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="font-['Roboto_Mono'] text-[12px]"
              disabled={isSending}
            />
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          {/* CC */}
          <div className="space-y-[8px]">
            <Label htmlFor="cc" className="font-['Roboto_Mono'] text-[11px] font-medium">
              Cc (Optional)
            </Label>
            <Input
              id="cc"
              type="text"
              placeholder="supervisor@email.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="font-['Roboto_Mono'] text-[12px]"
              disabled={isSending}
            />
          </div>

          {/* Subject */}
          <div className="space-y-[8px]">
            <Label htmlFor="subject" className="font-['Roboto_Mono'] text-[11px] font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="font-['Roboto_Mono'] text-[12px]"
              disabled={isSending}
            />
          </div>

          {/* Message Body */}
          <div className="space-y-[8px]">
            <Label htmlFor="message" className="font-['Roboto_Mono'] text-[11px] font-medium">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="font-['Roboto_Mono'] text-[12px] leading-[1.6]"
              disabled={isSending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-[12px] justify-end pt-[12px] border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
              className="font-['Roboto_Mono'] text-[11px]"
            >
              <X className="w-[14px] h-[14px] mr-[6px]" />
              Skip
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending}
              className="bg-accent text-white hover:opacity-90 font-['Roboto_Mono'] text-[11px]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-[14px] h-[14px] mr-[6px] animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-[14px] h-[14px] mr-[6px]" />
                  Send Update
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}