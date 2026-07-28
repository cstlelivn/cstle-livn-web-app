import { Mail, Phone, ExternalLink, TrendingUp, Trash2 } from "lucide-react";
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
      <div className="border border-border rounded-[var(--radius)] overflow-hidden bg-card">
        {/* Compact List Header */}
        <div className="grid grid-cols-[40px_200px_120px_120px_180px_1fr_140px] gap-[16px] px-[16px] py-[14px] bg-secondary/50 border-b border-border">
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
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Status</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Value</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Source</p>
          <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Contact</p>
          <p className="text-muted-foreground uppercase tracking-wide text-right" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Actions</p>
        </div>

        {/* Compact List Rows */}
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="relative group grid grid-cols-[40px_200px_120px_120px_180px_1fr_140px] gap-[16px] px-[16px] py-[14px] border-b border-border/50 hover:bg-accent/5 transition-colors items-center last:border-b-0"
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
            <p className="truncate cursor-pointer" onClick={() => onLeadClick(lead)} style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{lead.name}</p>

            {/* Status */}
            <Badge className={`${getStatusColor(lead.status)}`} style={{ fontSize: 'var(--text-small)' }}>
              {lead.status}
            </Badge>

            {/* Value */}
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)' }}>${(lead.value / 1000).toFixed(0)}k</p>

            {/* Source */}
            <Badge variant="outline" style={{ fontSize: 'var(--text-small)' }}>{lead.source}</Badge>

            {/* Contact */}
            <div className="flex items-center gap-[8px]">
              <Mail className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-normal)' }}>{lead.email}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-[8px]">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${lead.phone}`;
                }}
                style={{ fontSize: 'var(--text-small)' }}
              >
                <Phone className="w-[14px] h-[14px] mr-[6px]" />
                Call
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onLeadClick(lead);
                }}
                style={{ fontSize: 'var(--text-small)' }}
              >
                <ExternalLink className="w-[14px] h-[14px] mr-[6px]" />
                View
              </Button>
            </div>

            {/* Delete button - appears on hover */}
            <button
              onClick={(e) => onDeleteLead(lead.id, lead.name, e)}
              className="absolute right-[16px] top-1/2 -translate-y-1/2 p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              title="Delete lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {leads.map((lead) => (
        <Card key={lead.id} className="p-6 relative group">
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
            <Button variant="outline" className="flex-1" onClick={() => window.location.href = `tel:${lead.phone}`}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.location.href = `mailto:${lead.email}`}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button variant="default" onClick={() => onLeadClick(lead)}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Details
            </Button>
          </div>

          {/* Delete button - appears on hover */}
          <button
            onClick={(e) => onDeleteLead(lead.id, lead.name, e)}
            className="absolute top-[16px] right-[16px] p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Delete lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Card>
      ))}
    </div>
  );
}
