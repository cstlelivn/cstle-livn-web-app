import { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  DollarSign, 
  Edit, 
  Save, 
  X,
  FolderOpen,
  TrendingUp,
  User,
  MessageCircle,
  HardDrive,
  ScrollText,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import GoogleDriveIntegration, { GoogleDriveFile } from "./GoogleDriveIntegration";
import { formatDate } from "../src/lib/dates";
import { listClientRelatedEstimates } from "../src/features/revenue/api";

// Helper function to clean phone numbers
function encodeTel(raw: string) {
  // Strip spaces/dashes/parentheses; keep + and digits
  return raw.replace(/[^\d+]/g, "");
}

interface ClientDetailsDialogProps {
  client: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient?: (id: number, updates: any) => void;
  onOpenEstimate?: (estimateId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

export default function ClientDetailsDialog({
  client,
  isOpen,
  onClose,
  onUpdateClient,
  onOpenEstimate,
  onOpenProject,
}: ClientDetailsDialogProps) {
  const { projects } = useApp();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedClient, setEditedClient] = useState<any>(null);
  const [clientEstimates, setClientEstimates] = useState<any[]>([]);
  useEffect(() => { let active = true; if (!client?.id || !isOpen) { setClientEstimates([]); return; } listClientRelatedEstimates(String(client.id)).then((rows) => active && setClientEstimates(rows)).catch(() => active && setClientEstimates([])); return () => { active = false; }; }, [client?.id, isOpen]);

  // Early return AFTER all hooks have been called
  if (!client) {
    return null;
  }

  const displayClient = isEditMode && editedClient ? editedClient : client;

  // Normalize values so empty strings don't disable incorrectly
  const phone = (displayClient.phone ?? "").trim();
  const email = (displayClient.email ?? "").trim();
  const name = (displayClient.name ?? "").trim();

  // Get projects associated with this client
  const clientProjects = projects.filter((project: any) => String(project.clientId || '') === String(client.id) || String(project.client || '').toLowerCase() === String(client.name || '').toLowerCase());

  const handleEnterEditMode = () => {
    setEditedClient({ ...client });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedClient(null);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editedClient || !onUpdateClient) return;

    try {
      await onUpdateClient(client.id, editedClient);
      setIsEditMode(false);
      setEditedClient(null);
      toast.success("Client details updated successfully!");
    } catch (error) {
      toast.error("Failed to update client details");
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedClient((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Google Drive file handlers
  const handleAddGoogleDriveFile = (file: GoogleDriveFile) => {
    const currentFiles = displayClient.googleDriveFiles || [];
    handleFieldChange("googleDriveFiles", [...currentFiles, file]);
  };

  const handleRemoveGoogleDriveFile = (fileId: string) => {
    const currentFiles = displayClient.googleDriveFiles || [];
    handleFieldChange(
      "googleDriveFiles",
      currentFiles.filter((f: GoogleDriveFile) => f.id !== fileId)
    );
  };

  const handleUpdateGoogleDriveFile = (fileId: string, updates: Partial<GoogleDriveFile>) => {
    const currentFiles = displayClient.googleDriveFiles || [];
    handleFieldChange(
      "googleDriveFiles",
      currentFiles.map((f: GoogleDriveFile) =>
        f.id === fileId ? { ...f, ...updates } : f
      )
    );
  };

  const handleCall = () => {
    if (!phone) return;
    // tel: works on devices with a dialer
    window.location.href = `tel:${encodeTel(phone)}`;
  };

  const handleEmail = () => {
    if (!email) return;
    const subject = encodeURIComponent(`Hello${name ? ` ${name}` : ""}`);
    const body = encodeURIComponent("");
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleSMS = () => {
    if (!phone) return;
    // sms: is best-effort (mobile). The query param differs iOS/Android; this covers both reasonably.
    const txt = encodeURIComponent("");
    // Attempt universal format; most platforms accept `?&body=...`
    window.location.href = `sms:${encodeTel(phone)}?&body=${txt}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Active": "bg-accent text-accent-foreground",
      "Past": "bg-primary text-primary-foreground",
      "On Hold": "bg-warning text-white",
      "Lost": "bg-destructive text-destructive-foreground",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
                Client Management
              </DialogTitle>
              <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                {isEditMode ? "Edit client information" : "Comprehensive client profile"}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {!isEditMode && onUpdateClient && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnterEditMode}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Client Header Card */}
        <Card className="p-6 mt-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-6 h-6 text-muted-foreground" />
                <h2 style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
                  {displayClient.name}
                </h2>
                <Badge className={getStatusColor(displayClient.status)}>
                  {displayClient.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                    {displayClient.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                    {displayClient.phone}
                  </span>
                </div>
                {displayClient.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                      {displayClient.company}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p 
                className="text-muted-foreground uppercase mb-1" 
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                Total Value
              </p>
              <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                ${(displayClient.totalValue || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p 
                className="text-muted-foreground uppercase mb-1" 
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                Projects
              </p>
              <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                {displayClient.projectsCount || 0}
              </p>
            </div>
            <div>
              <p 
                className="text-muted-foreground uppercase mb-1" 
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
              >
                Client Since
              </p>
              <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                {displayClient.lastContact || "N/A"}
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList
            className="grid w-full grid-cols-4"
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
          >
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects ({clientProjects.length})</TabsTrigger>
            <TabsTrigger value="estimates">Estimates ({clientEstimates.length})</TabsTrigger>
            <TabsTrigger value="google-drive">
              <HardDrive className="w-4 h-4 mr-2" />
              Google Drive
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Contact Information */}
            <Card className="p-6">
              <h3 
                className="uppercase mb-4 text-muted-foreground" 
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h4)' }}
              >
                Contact Information
              </h3>
              
              {isEditMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Full Name
                    </Label>
                    <Input
                      value={editedClient?.name || ""}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Status
                    </Label>
                    <Select
                      value={editedClient?.status || ""}
                      onValueChange={(value) => handleFieldChange("status", value)}
                    >
                      <SelectTrigger 
                        className="mt-2" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Past">Past</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={editedClient?.email || ""}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Phone
                    </Label>
                    <Input
                      type="tel"
                      value={editedClient?.phone || ""}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Company
                    </Label>
                    <Input
                      value={editedClient?.company || ""}
                      onChange={(e) => handleFieldChange("company", e.target.value)}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                    />
                  </div>
                  <div>
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Source
                    </Label>
                    <Select
                      value={editedClient?.source || ""}
                      onValueChange={(value) => handleFieldChange("source", value)}
                    >
                      <SelectTrigger 
                        className="mt-2" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Address
                    </Label>
                    <Input
                      value={editedClient?.address || ""}
                      onChange={(e) => handleFieldChange("address", e.target.value)}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      placeholder="Street address, City, State, ZIP"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                      Notes
                    </Label>
                    <Textarea
                      value={editedClient?.notes || ""}
                      onChange={(e) => handleFieldChange("notes", e.target.value)}
                      placeholder="Add notes about this client..."
                      rows={4}
                      className="mt-2"
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p 
                        className="text-muted-foreground mb-1" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        Email
                      </p>
                      <a 
                        href={`mailto:${displayClient.email}`} 
                        className="hover:underline flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--accent)' }}
                      >
                        <Mail className="w-4 h-4" />
                        {displayClient.email}
                      </a>
                    </div>
                    <div>
                      <p 
                        className="text-muted-foreground mb-1" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        Phone
                      </p>
                      <a 
                        href={`tel:${displayClient.phone}`} 
                        className="hover:underline flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--accent)' }}
                      >
                        <Phone className="w-4 h-4" />
                        {displayClient.phone}
                      </a>
                    </div>
                    {displayClient.company && (
                      <div>
                        <p 
                          className="text-muted-foreground mb-1" 
                          style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                        >
                          Company
                        </p>
                        <p 
                          className="flex items-center gap-2" 
                          style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                        >
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {displayClient.company}
                        </p>
                      </div>
                    )}
                    <div>
                      <p 
                        className="text-muted-foreground mb-1" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        Source
                      </p>
                      <p 
                        className="flex items-center gap-2" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      >
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        {displayClient.source || "Direct"}
                      </p>
                    </div>
                  </div>
                  
                  {displayClient.address && (
                    <div className="pt-4 border-t">
                      <p 
                        className="text-muted-foreground mb-1" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        Address
                      </p>
                      <p 
                        className="flex items-center gap-2" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {displayClient.address}
                      </p>
                    </div>
                  )}

                  {displayClient.notes && (
                    <div className="pt-4 border-t">
                      <p 
                        className="text-muted-foreground mb-2" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        General Notes
                      </p>
                      <p 
                        className="text-muted-foreground whitespace-pre-wrap" 
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                      >
                        {displayClient.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="mt-6">
            <div className="space-y-3">
              {clientProjects.length === 0 ? (
                <Card className="p-12 text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p 
                    className="text-muted-foreground" 
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
                  >
                    No projects found for this client
                  </p>
                </Card>
              ) : (
                clientProjects.map((project) => (
                  <Card key={project.id} role="button" tabIndex={0} onClick={() => onOpenProject?.(String(project.id))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenProject?.(String(project.id)); }} className="cursor-pointer p-4 transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(25,25,25,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65733d]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 
                          className="mb-2" 
                          style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}
                        >
                          {project.title}
                        </h4>
                        <div className="flex items-center gap-4 mb-3">
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                          <span 
                            className="text-muted-foreground" 
                            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                          >
                            {project.phase}
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>
                              ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span 
                              className="text-muted-foreground" 
                              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                            >
                              {project.startDate ? formatDate(project.startDate) : "—"} - {project.endDate ? formatDate(project.endDate) : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-right">
                        <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); onOpenProject?.(String(project.id)); }}>Open <ArrowUpRight className="ml-1 size-3.5" /></Button>
                        <div>
                        <p 
                          className="text-muted-foreground uppercase mb-1" 
                          style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                        >
                          Progress
                        </p>
                        <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h2)', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                          {project.progress}%
                        </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="estimates" className="mt-6">
            <div className="space-y-2">{clientEstimates.length === 0 ? <Card className="p-10 text-center"><ScrollText className="mx-auto mb-3 size-9 text-muted-foreground" /><p className="text-sm text-muted-foreground">No estimates found for this customer.</p></Card> : clientEstimates.map((estimate) => <button key={estimate.id} type="button" onClick={() => onOpenEstimate?.(String(estimate.id))} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[12px] border border-black/[0.07] bg-card p-3 text-left transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65733d]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{estimate.name}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{estimate.site_address || 'Address not added'} · {String(estimate.status).replace(/_/g, ' ')}</span></span><span className="flex items-center gap-2 text-[10px] font-semibold uppercase text-[#53602f]">Open estimate <ArrowUpRight className="size-3.5" /></span></button>)}</div>
          </TabsContent>

          {/* GOOGLE DRIVE TAB */}
          <TabsContent value="google-drive" className="mt-6">
            <GoogleDriveIntegration
              files={displayClient.googleDriveFiles || []}
              onAddFile={handleAddGoogleDriveFile}
              onRemoveFile={handleRemoveGoogleDriveFile}
              onUpdateFile={handleUpdateGoogleDriveFile}
              isEditMode={isEditMode}
              title="Google Drive Files"
              description="Proposals, photos, contracts, and documents stored in Google Drive"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
