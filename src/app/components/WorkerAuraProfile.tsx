import { Briefcase, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import AuraProfileCard from './AuraProfileCard';

interface WorkerAuraProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: { id: string; name: string; role?: string; email?: string; phone?: string; skills?: string } | null;
  projects: any[];
}

// Aura is deliberately performance-only. Payroll, bonuses, discipline and
// promotion are separate human-reviewed workflows and are never presented as
// part of this profile.
export default function WorkerAuraProfile({ open, onOpenChange, worker }: WorkerAuraProfileProps) {
  if (!worker) return null;
  const display = { fontFamily: 'Anybody', fontVariationSettings: "'wdth' 137", fontStretch: '137%', fontWeight: 800, letterSpacing: '-0.04em' } as const;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] max-h-[90vh] overflow-y-auto bg-background border-border rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="text-[30px]" style={display}>{worker.name}</DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] text-[11px]">
            Transparent performance from reviewed tasks, real timers, evidence and approved delays.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-x-5 gap-y-2 py-3 border-y border-border font-['Roboto_Mono'] text-[10px] text-muted-foreground">
          {worker.role && <span className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" />{worker.role}</span>}
          {worker.email && <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{worker.email}</span>}
          {worker.phone && <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{worker.phone}</span>}
        </div>
        <AuraProfileCard teamMemberId={String(worker.id)} />
      </DialogContent>
    </Dialog>
  );
}
