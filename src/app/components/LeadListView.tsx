import { Mail, MapPin, Phone, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";

interface LeadListViewProps {
  leads: any[];
  viewMode: "grid" | "list";
  onLeadClick: (lead: any) => void;
  onDeleteLead: (id: number, name: string, e?: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
  selectedLeadIds?: number[];
  onToggleSelection?: (leadId: number) => void;
  onToggleSelectAll?: () => void;
}

export default function LeadListView({
  leads,
  viewMode,
  onLeadClick,
  onDeleteLead,
  getStatusColor,
  selectedLeadIds = [],
  onToggleSelection,
  onToggleSelectAll,
}: LeadListViewProps) {
  if (viewMode === "list") {
    return (
      <div className="overflow-x-auto rounded-[14px] border border-black/[0.07] bg-card shadow-[0_14px_36px_rgba(25,25,25,0.06)]">
        {/* Compact List Header -- desktop/tablet only; the fixed-pixel
            column grid below has no room to shrink further, so it's
            hidden under md rather than silently clipping the Source/
            Contact/Actions columns off-screen (the previous bug: this
            container had overflow-hidden with no way to scroll to them). */}
        <div className="hidden min-w-[1060px] md:grid grid-cols-[40px_minmax(180px,1.1fr)_minmax(190px,1.35fr)_120px_100px_minmax(190px,1fr)_88px] gap-4 border-b border-black/[0.07] bg-[#f4f5ef] px-4 py-3">
          <div className="flex items-center justify-center">
            {onToggleSelectAll && (
              <Checkbox
                checked={selectedLeadIds.length === leads.length && leads.length > 0}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all leads"
              />
            )}
          </div>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Name</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Project</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Status</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Value</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Contact</p>
          <p className="text-muted-foreground uppercase tracking-wide text-right" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Actions</p>
        </div>

        {/* Compact List Rows -- desktop/tablet */}
        {leads.map((lead) => (
          <div
            key={lead.id}
            role="button"
            tabIndex={0}
            onClick={() => onLeadClick(lead)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onLeadClick(lead); } }}
            className="group hidden min-w-[1060px] cursor-pointer md:grid grid-cols-[40px_minmax(180px,1.1fr)_minmax(190px,1.35fr)_120px_100px_minmax(190px,1fr)_88px] items-center gap-4 border-b border-black/[0.055] px-4 py-3.5 transition-[background-color,box-shadow] hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d] last:border-b-0"
          >
            {/* Checkbox */}
            <div className="flex items-center justify-center">
              {onToggleSelection && (
                <Checkbox
                  checked={selectedLeadIds.includes(lead.id)}
                  onCheckedChange={() => onToggleSelection(lead.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${lead.name}`}
                />
              )}
            </div>

            {/* Name */}
            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#191919]">{lead.name}</p><p className="mt-0.5 truncate font-['Roboto_Mono'] text-[9px] uppercase tracking-[0.04em] text-muted-foreground">{lead.source || 'Direct / unknown'}</p></div>

            {/* Project */}
            <div className="min-w-0"><p className="truncate text-[12px] font-medium text-[#191919]/85">{lead.service_type || lead.project_type || lead.interest || 'Project not specified'}</p><p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="truncate">{lead.project_address || lead.address || lead.city || 'Address not added'}</span></p></div>

            {/* Status */}
            <Badge className={`${getStatusColor(lead.status)}`} style={{ fontSize: 'var(--text-small)' }}>
              {lead.status}
            </Badge>

            {/* Value */}
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>${(lead.value / 1000).toFixed(0)}k</p>

            {/* Contact */}
            <div className="flex items-center gap-[8px]">
              <Mail className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-normal)' }}>{lead.email}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1 border-l border-black/[0.07] pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${lead.phone}`;
                }}
                className="h-8 w-8 p-0"
                aria-label={`Call ${lead.name}`}
                disabled={!lead.phone}
              >
                <Phone className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => onDeleteLead(lead.id, lead.name, e)} className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${lead.name}`}><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        ))}

        {/* Mobile card rows -- same data/actions as the table above, just
            stacked instead of clipped. */}
        <div className="md:hidden divide-y divide-border/50">
          {leads.map((lead) => (
            <div key={lead.id} role="button" tabIndex={0} onClick={() => onLeadClick(lead)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onLeadClick(lead); }} className="space-y-3 p-4 transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d]">
              <div className="flex items-start gap-3">
                {onToggleSelection && (
                  <Checkbox
                    checked={selectedLeadIds.includes(lead.id)}
                    onCheckedChange={() => onToggleSelection(lead.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${lead.name}`}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{lead.name}</p>
                    <p className="shrink-0" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>${(lead.value / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={getStatusColor(lead.status)} style={{ fontSize: 'var(--text-small)' }}>{lead.status}</Badge>
                    <Badge variant="outline" style={{ fontSize: 'var(--text-small)' }}>{lead.source}</Badge>
                  </div>
                  <div className="flex items-center gap-[6px] mt-2 text-muted-foreground">
                    <Mail className="w-[14px] h-[14px] shrink-0" />
                    <span className="truncate" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>{lead.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${lead.phone}`; }}>
                  <Phone className="w-[14px] h-[14px] mr-[6px]" />
                  Call
                </Button>
                <button
                  onClick={(e) => onDeleteLead(lead.id, lead.name, e)}
                  className="p-2 rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors shrink-0"
                  title="Delete lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {leads.map((lead) => (
        <Card key={lead.id} role="button" tabIndex={0} onClick={() => onLeadClick(lead)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onLeadClick(lead); }} className="group relative cursor-pointer p-6 shadow-[0_12px_32px_rgba(25,25,25,0.06)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(25,25,25,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65733d]">
          {/* Checkbox - Top left */}
          {onToggleSelection && (
            <div className="absolute top-[16px] left-[16px] z-10">
              <Checkbox
                checked={selectedLeadIds.includes(lead.id)}
                onCheckedChange={() => onToggleSelection(lead.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${lead.name}`}
                className="bg-background border-2"
              />
            </div>
          )}

          <div className="flex items-start justify-between mb-4 ml-8">
            <div>
              <h3 className="mb-1">{lead.name}</h3>
              <Badge className={getStatusColor(lead.status)}>
                {lead.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Est. Value</p>
              <p>${lead.value.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{lead.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{lead.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{lead.source}</Badge>
            </div>
          </div>

          {lead.notes && (
            <div className="p-3 rounded-lg bg-secondary/50 mb-4">
              <p className="text-muted-foreground mb-1">Notes:</p>
              <p>{lead.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={(event) => { event.stopPropagation(); window.location.href = `tel:${lead.phone}`; }}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" className="flex-1" onClick={(event) => { event.stopPropagation(); window.location.href = `mailto:${lead.email}`; }}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button variant="default" onClick={(event) => { event.stopPropagation(); onLeadClick(lead); }}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Details
            </Button>
            <Button variant="ghost" className="px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={(event) => onDeleteLead(lead.id, lead.name, event)} aria-label={`Delete ${lead.name}`}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
