import { useState } from "react";
import { Send, X, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface BulkCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: any[];
  onClearSelection: () => void;
}

export default function BulkCampaignDialog({
  open,
  onOpenChange,
  selectedLeads,
  onClearSelection,
}: BulkCampaignDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/bulk-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            leads: selectedLeads.map(lead => ({
              email: lead.email,
              name: lead.name,
            })),
            subject,
            message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails");
      }

      toast.success(`Successfully sent ${data.sent} email(s)!`);
      setSubject("");
      setMessage("");
      onClearSelection();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Bulk email error:", error);
      toast.error(error.message || "Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Bulk Email Campaign</DialogTitle>
          <DialogDescription>
            Send an email to {selectedLeads.length} selected lead{selectedLeads.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[var(--spacing-md)]">
          {/* Selected Recipients */}
          <div>
            <Label>Recipients ({selectedLeads.length})</Label>
            <div className="mt-2 max-h-32 overflow-y-auto border border-border rounded-[var(--radius)] p-[var(--spacing-sm)] bg-secondary/20">
              <div className="flex flex-wrap gap-2">
                {selectedLeads.map((lead) => (
                  <Badge 
                    key={lead.id} 
                    variant="secondary"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    {lead.name} ({lead.email})
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="email-subject">Subject Line</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Exclusive Offer from Cstle Livn"
              className="mt-2"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your email message here... You can use {{name}} to personalize with the recipient's name."
              rows={8}
              className="mt-2"
            />
            <p className="text-muted-foreground mt-2" style={{ fontSize: 'var(--text-small)' }}>
              Tip: Use {'{{name}}'} in your message to automatically insert each recipient's name
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-[var(--spacing-sm)]">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSubject("");
                setMessage("");
              }}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onClearSelection();
                  onOpenChange(false);
                }}
              >
                Clear Selection
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !subject.trim() || !message.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? `Sending...` : `Send to ${selectedLeads.length} Lead${selectedLeads.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
