import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { forceCompleteProject } from "../src/features/projects/api";

interface ForceCompleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  incompletePhaseCount: number;
  onComplete: () => void;
}

export default function ForceCompleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  incompletePhaseCount,
  onComplete,
}: ForceCompleteProjectDialogProps) {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleForceComplete = async () => {
    if (!currentUser || !reason.trim()) {
      toast.error("A reason is required to force-complete this project");
      return;
    }
    setSaving(true);
    try {
      await forceCompleteProject(String(projectId), String(currentUser.id), reason.trim());
      toast.success("Project force-completed");
      handleClose();
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to force-complete project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px] flex items-center gap-[8px]">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Force Complete Project
          </DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] text-[10px]">
            {incompletePhaseCount > 0
              ? `${incompletePhaseCount} phase(s) are not yet completed. Forcing completion skips that check.`
              : "This will mark the project complete outside the normal phase-completion flow."}{" "}
            This action is logged permanently to the project's history and cannot be undone quietly.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="font-['Roboto_Mono'] text-[11px]">Reason *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this project being force-completed?"
            className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
          />
        </div>
        <DialogFooter>
          <button
            onClick={handleClose}
            className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]"
          >
            Cancel
          </button>
          <button
            onClick={handleForceComplete}
            disabled={saving || !reason.trim()}
            className="px-[14px] py-[7px] bg-destructive text-destructive-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50"
          >
            {saving ? "Completing…" : "Force Complete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
