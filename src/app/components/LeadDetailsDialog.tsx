import { useState } from "react";
import { X, Phone, Mail, Calendar, Bell, UserCheck, Clock, Edit, MapPin, DollarSign, Tag, ExternalLink, Save, Building2, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import { SERVICE_TYPES } from "../src/constants/serviceTypes";

interface Lead {
  id: number;
  first_name?: string;
  last_name?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  source_form?: string;
  source_page?: string;
  interest: string;
  status: string;
  estimated_value?: number;
  value?: number;
  notes?: string;
  internal_notes?: string;
  dateAdded: string;
  address?: string;
  project_address?: string;
  province?: string;
  consultation_date?: string;
  consultation_time?: string;
  consultationDate?: string;
  project_interest?: string;
  project_description?: string;
  service_type?: string;
  project_type?: string;
  project_details?: string;
  message?: string;
  links?: string;
  company?: string;
  lastContact?: string;
  last_contact?: string;
  created_at?: string;
}

interface LeadDetailsDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConvertToClient?: (leadId: number) => void;
  onUpdateLead?: (leadId: number, updates: Partial<Lead>) => void;
}

export default function LeadDetailsDialog({ lead, isOpen, onClose, onConvertToClient, onUpdateLead }: LeadDetailsDialogProps) {
  const { addReminder } = useApp();
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderType, setReminderType] = useState<"call" | "email" | "visit" | "follow-up">("follow-up");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderNotes, setReminderNotes] = useState("");
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead | null>(null);

  if (!lead) return null;

  // Initialize edited lead when entering edit mode
  const handleEnterEditMode = () => {
    setEditedLead({ ...lead });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedLead(null);
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editedLead || !onUpdateLead) return;

    console.log('💾 Saving lead edits:', editedLead);

    const updates: any = {
      name: editedLead.name,
      email: editedLead.email,
      phone: editedLead.phone,
      status: editedLead.status,
      source: editedLead.source,
      project_address: editedLead.project_address || editedLead.address,
      province: editedLead.province,
      estimated_value: editedLead.estimated_value || editedLead.value || 0,
      internal_notes: editedLead.internal_notes,
      consultation_date: editedLead.consultation_date || editedLead.consultationDate,
      consultation_time: editedLead.consultation_time,
      service_type: editedLead.service_type,
      project_type: editedLead.project_type,
      project_details: editedLead.project_details,
      message: editedLead.message,
      company: editedLead.company,
      links: editedLead.links,
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    console.log('📤 Sending updates:', updates);

    onUpdateLead(lead.id, updates);
    
    // Don't show success toast here - let the parent handler show it after API call
    setIsEditMode(false);
    setEditedLead(null);
  };

  const handleFieldChange = (field: keyof Lead, value: any) => {
    if (!editedLead) return;
    setEditedLead({
      ...editedLead,
      [field]: value,
    });
  };

  const displayLead = isEditMode && editedLead ? editedLead : lead;

  // Format consultation date as "DD - MTH - YYYY" (date only — time stored separately in consultation_time)
  const formatConsultationDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      // Parse as UTC date to avoid timezone shifting the day
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getUTCDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  // Format "HH:MM" or "HH:MM:SS" to 12-hour AM/PM
  const formatConsultationTime = (timeString: string | undefined) => {
    if (!timeString) return null;
    try {
      const [hStr, mStr] = timeString.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (isNaN(h) || isNaN(m)) return timeString;
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    } catch {
      return timeString;
    }
  };

  // HTML-escape helper for email body
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const getStatusColor = (status: string) => {
    if (status === "New Lead" || status === "New") return "bg-accent/10 text-accent border-accent/30";
    if (status === "Contacted") return "bg-primary/10 text-primary border-primary/30";
    if (status === "Proposal") return "bg-primary text-primary-foreground border-primary";
    if (status === "Converted" || status === "Won") return "bg-success/10 text-success border-success/30";
    if (status === "Closed" || status === "Lost") return "bg-destructive/10 text-destructive border-destructive/30";
    return "bg-muted/10 text-muted-foreground border-border";
  };

  // Direct pipeline-stage change, available without entering full Edit
  // mode -- changing where a lead sits in the pipeline shouldn't require
  // opening the whole edit form first.
  const handleStatusChange = (newStatus: string) => {
    if (!onUpdateLead) return;
    onUpdateLead(displayLead.id, { status: newStatus });
  };

  const handleCall = () => {
    if (!displayLead.phone) {
      toast.error("No phone number available");
      return;
    }
    // Use tel: link to open native dialer
    window.location.href = `tel:${displayLead.phone}`;
    toast.success(`Calling ${displayLead.name}...`);
    
    // Update lead status to "Contacted" if it was "New Lead"
    if ((displayLead.status === "New Lead" || displayLead.status === "New") && onUpdateLead) {
      onUpdateLead(displayLead.id, { 
        status: "Contacted",
        last_contact: new Date().toISOString()
      });
    }
  };

  const handleEmail = () => {
    if (!displayLead.email) {
      toast.error("No email address available");
      return;
    }
    // Pre-fill subject and body
    const subject = encodeURIComponent(`Consultation Follow-up - ${displayLead.name}`);
    const body = encodeURIComponent(`Hello ${displayLead.first_name || displayLead.name},\n\nThank you for your interest in ${displayLead.project_interest || displayLead.interest || "our services"}.\n\nI'd like to schedule a consultation to discuss your project${displayLead.address ? ` at ${displayLead.address}` : ""}.\n\n${displayLead.consultation_date || displayLead.consultationDate ? `I see you've requested a consultation on ${displayLead.consultation_date || displayLead.consultationDate}. Does this time still work for you?` : "When would be a good time for you?"}\n\nBest regards,\nCstle Livn Team`);
    
    // Use mailto: link to open native email client
    window.location.href = `mailto:${displayLead.email}?subject=${subject}&body=${body}`;
    toast.success(`Opening email to ${displayLead.name}...`);
    
    // Update lead status to "Contacted" if it was "New Lead"
    if ((displayLead.status === "New Lead" || displayLead.status === "New") && onUpdateLead) {
      onUpdateLead(displayLead.id, { 
        status: "Contacted",
        last_contact: new Date().toISOString()
      });
    }
  };

  const handleScheduleAppointment = () => {
    if (!displayLead.consultation_date && !displayLead.consultationDate && !displayLead.address) {
      toast.error("No consultation date or address available");
      return;
    }
    
    // Create calendar event using data: URL with ICS format (works on most devices)
    const eventTitle = `Consultation with ${displayLead.name}`;
    const eventLocation = displayLead.address || "";
    const eventDescription = `Project: ${displayLead.project_interest || displayLead.interest || "TBD"}\\n\\nDescription: ${displayLead.project_description || displayLead.notes || "N/A"}\\n\\nContact: ${displayLead.phone || "N/A"}\\nEmail: ${displayLead.email || "N/A"}`;
    
    // Parse consultation date or use today + 1 week as default
    let startDate = new Date();
    if (displayLead.consultation_date || displayLead.consultationDate) {
      startDate = new Date(displayLead.consultation_date || displayLead.consultationDate || "");
    } else {
      startDate.setDate(startDate.getDate() + 7); // Default: 1 week from now
    }
    
    // Set to 10 AM if no time specified
    const dateStr = displayLead.consultation_date || displayLead.consultationDate || "";
    if (dateStr && !dateStr.includes("T")) {
      startDate.setHours(10, 0, 0, 0);
    }
    
    // End date is 1 hour after start
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    
    // Format dates for ICS (YYYYMMDDTHHMMSS)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cstle Livn//Admin App//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@cstlelivn.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDescription}`,
      `LOCATION:${eventLocation}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\\r\\n');
    
    // Create downloadable ICS file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consultation-${displayLead.name.replace(/\\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    toast.success("Calendar event downloaded! Open it to add to your calendar.");
  };

  const handleScheduleReminder = () => {
    setReminderType("follow-up");
    setIsReminderDialogOpen(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderDate) {
      toast.error("Pick a date for the follow-up");
      return;
    }
    try {
      await addReminder({
        leadId: displayLead.id,
        leadName: displayLead.name,
        contactEmail: displayLead.email,
        contactPhone: displayLead.phone,
        type: reminderType,
        date: reminderDate,
        time: reminderTime,
        notes: reminderNotes,
      });
      
      toast.success(`Reminder scheduled for ${reminderDate} at ${reminderTime}`);
      
      setReminderDate("");
      setReminderTime("");
      setReminderNotes("");
      setIsReminderDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save reminder");
    }
  };

  const handleConvertToClient = () => {
    if (onConvertToClient) {
      onConvertToClient(displayLead.id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            fontFamily: 'var(--font-family-body)',
          }}
        >
          {/* Header - Fixed */}
          <DialogHeader className="pb-4 border-b border-border shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
              <div className="flex-1">
                <DialogTitle 
                  className="flex items-center gap-2 mb-2"
                  style={{ 
                    fontFamily: 'var(--font-family-heading)', 
                    fontVariationSettings: "'wdth' 137", 
                    fontWeight: 800,
                    fontSize: 'var(--text-h2)'
                  }}
                >
                  {displayLead.name}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode ? "Edit lead information and update details" : "View complete lead information and take action"}
                </DialogDescription>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {!isEditMode && onUpdateLead ? (
                    <Select value={displayLead.status} onValueChange={handleStatusChange}>
                      <SelectTrigger
                        className={`${getStatusColor(displayLead.status)} border h-7 w-auto min-w-[110px] px-2.5 py-0`}
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      className={`${getStatusColor(displayLead.status)} border`}
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                    >
                      {displayLead.status}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                  >
                    {displayLead.source}
                  </Badge>
                  {displayLead.source_form && (
                    <Badge 
                      className={`border ${
                        displayLead.source_form === "booking" 
                          ? "bg-accent/10 text-accent border-accent/30" 
                          : "bg-primary/10 text-primary border-primary/30"
                      }`}
                      style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}
                    >
                      {displayLead.source_form === "booking" ? "Book Service Form" : "Contact Form"}
                    </Badge>
                  )}
                  <span 
                    className="text-muted-foreground"
                    style={{ fontSize: 'var(--text-label)' }}
                  >
                    • Added {displayLead.dateAdded}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p 
                    className="text-muted-foreground uppercase mb-1"
                    style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}
                  >
                    Est. Value
                  </p>
                  <p 
                    style={{ 
                      fontFamily: 'var(--font-family-heading)', 
                      fontWeight: 'var(--font-weight-bold)',
                      fontSize: 'var(--text-h3)'
                    }}
                  >
                    ${(displayLead.estimated_value || displayLead.value || 0).toLocaleString()}
                  </p>
                </div>
                {!isEditMode && onUpdateLead && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEditMode}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto py-4">
            {isEditMode ? (
              // Edit Mode - Compact Form
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Name</Label>
                    <Input
                      value={editedLead?.name || ""}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Status</Label>
                    <Select
                      value={editedLead?.status || ""}
                      onValueChange={(value) => handleFieldChange("status", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Email</Label>
                    <Input
                      type="email"
                      value={editedLead?.email || ""}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Phone</Label>
                    <Input
                      type="tel"
                      value={editedLead?.phone || ""}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Project Address</Label>
                    <Input
                      value={editedLead?.project_address || editedLead?.address || ""}
                      onChange={(e) => handleFieldChange("project_address", e.target.value)}
                      className="mt-1"
                      placeholder="Enter project address"
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Province</Label>
                    <Input
                      value={editedLead?.province || ""}
                      onChange={(e) => handleFieldChange("province", e.target.value)}
                      className="mt-1"
                      placeholder="e.g. British Columbia"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Service Type</Label>
                    <Select
                      value={editedLead?.service_type || ""}
                      onValueChange={(value) => handleFieldChange("service_type", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Consultation Date</Label>
                    <Input
                      type="date"
                      value={editedLead?.consultation_date ? editedLead.consultation_date.split('T')[0] : ""}
                      onChange={(e) => handleFieldChange("consultation_date", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Preferred Time</Label>
                    <Input
                      type="time"
                      value={editedLead?.consultation_time || ""}
                      onChange={(e) => handleFieldChange("consultation_time", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label style={{ fontSize: 'var(--text-label)' }}>Est. Value ($)</Label>
                    <Input
                      type="number"
                      value={editedLead?.estimated_value || editedLead?.value || 0}
                      onChange={(e) => handleFieldChange("estimated_value", parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      placeholder="25000"
                    />
                  </div>
                </div>

                <div>
                  <Label style={{ fontSize: 'var(--text-label)' }}>
                    {editedLead?.source_form === "booking" ? "Project Details" : "Message"}
                  </Label>
                  <Textarea
                    value={editedLead?.source_form === "booking"
                      ? (editedLead?.project_details || "")
                      : (editedLead?.message || editedLead?.project_details || "")}
                    onChange={(e) => handleFieldChange(
                      editedLead?.source_form === "booking" ? "project_details" : "message",
                      e.target.value
                    )}
                    rows={3}
                    className="mt-1"
                    placeholder="Customer-submitted project details..."
                  />
                </div>

                <div>
                  <Label style={{ fontSize: 'var(--text-label)' }}>Source</Label>
                  <Select
                    value={editedLead?.source || ""}
                    onValueChange={(value) => handleFieldChange("source", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website - Book Service">Website Booking</SelectItem>
                      <SelectItem value="Website - Contact Form">Website Contact</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Email Campaign">Email Campaign</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Phone Call">Phone Call</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{ fontSize: 'var(--text-label)' }}>Internal Notes (Admin Only)</Label>
                  <Textarea
                    value={editedLead?.internal_notes || ""}
                    onChange={(e) => handleFieldChange("internal_notes", e.target.value)}
                    rows={3}
                    className="mt-1"
                    placeholder="Private admin notes — not visible to the customer..."
                  />
                </div>
              </div>
            ) : (
              // View Mode - Clean Layout
              <div className="space-y-6">
                {/* Project Location — show if address OR province exists */}
                {(displayLead.project_address || displayLead.address || displayLead.province) && (
                  <div
                    className="p-4 rounded-lg border-2 border-accent/30 bg-accent/5"
                    style={{ borderRadius: 'var(--radius-card)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <MapPin className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p
                          className="uppercase text-accent mb-1"
                          style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}
                        >
                          Project Location
                        </p>
                        {(displayLead.project_address || displayLead.address) && (
                          <p style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', fontVariationSettings: "'wdth' 137" }}>
                            {displayLead.project_address || displayLead.address}
                          </p>
                        )}
                        {displayLead.province && (
                          <p style={{ fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                            {displayLead.province}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact & Service Info — Two Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contact Information */}
                  <div className="p-4 rounded-lg border border-border bg-card" style={{ borderRadius: 'var(--radius)' }}>
                    <p className="uppercase text-muted-foreground mb-3" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>
                      Contact Information
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span style={{ fontSize: 'var(--text-base)' }}>{displayLead.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span style={{ fontSize: 'var(--text-base)' }}>{displayLead.phone}</span>
                      </div>
                      {displayLead.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span style={{ fontSize: 'var(--text-base)' }}>{displayLead.company}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Information */}
                  <div className="p-4 rounded-lg border border-border bg-card" style={{ borderRadius: 'var(--radius)' }}>
                    <p className="uppercase text-muted-foreground mb-3" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>
                      {displayLead.source_form === "booking" ? "Service Information" : "Inquiry Information"}
                    </p>
                    <div className="space-y-3">
                      {(displayLead.service_type || displayLead.project_type || displayLead.project_interest || displayLead.interest) && (
                        <div>
                          <p className="text-muted-foreground uppercase" style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                            {displayLead.source_form === "booking" ? "Service Type" : "Project Type"}
                          </p>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span style={{ fontSize: 'var(--text-base)' }}>
                              {displayLead.service_type || displayLead.project_type || displayLead.project_interest || displayLead.interest}
                            </span>
                          </div>
                        </div>
                      )}
                      {(displayLead.consultation_date || displayLead.consultationDate) && (
                        <div>
                          <p className="text-muted-foreground uppercase" style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                            Preferred Date
                          </p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span style={{ fontSize: 'var(--text-base)' }}>
                              {formatConsultationDate(displayLead.consultation_date || displayLead.consultationDate)}
                            </span>
                          </div>
                        </div>
                      )}
                      {displayLead.consultation_time && (
                        <div>
                          <p className="text-muted-foreground uppercase" style={{ fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                            Preferred Time
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span style={{ fontSize: 'var(--text-base)' }}>
                              {formatConsultationTime(displayLead.consultation_time)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Project Details / Message */}
                {(displayLead.project_details || displayLead.message || displayLead.project_description) && (
                  <div
                    className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5"
                    style={{ borderRadius: 'var(--radius-card)' }}
                  >
                    <p className="uppercase text-primary mb-2" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>
                      {displayLead.source_form === "booking" ? "Project Details" : "Message"}
                    </p>
                    <p style={{ fontSize: 'var(--text-base)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {displayLead.source_form === "booking"
                        ? (displayLead.project_details || displayLead.project_description)
                        : (displayLead.message || displayLead.project_details || displayLead.project_description)}
                    </p>
                  </div>
                )}

                {/* Submission Information */}
                <div className="p-4 rounded-lg border border-border bg-card" style={{ borderRadius: 'var(--radius)' }}>
                  <p className="uppercase text-muted-foreground mb-3" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>
                    Submission Information
                  </p>
                  <div className="space-y-2">
                    {displayLead.source_form && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Form:</span>
                        <span style={{ fontSize: 'var(--text-base)' }}>
                          {displayLead.source_form === "booking" ? "Booking Request" : "Contact Form"}
                        </span>
                      </div>
                    )}
                    {displayLead.source_page && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Page:</span>
                        <span style={{ fontSize: 'var(--text-base)' }}>{displayLead.source_page}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Submitted:</span>
                      <span style={{ fontSize: 'var(--text-base)' }}>{displayLead.dateAdded}</span>
                    </div>
                    {displayLead.links && (
                      <div className="flex items-start gap-2">
                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Links:</span>
                        <span style={{ fontSize: 'var(--text-base)', wordBreak: 'break-all' }}>{displayLead.links}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes — Admin Only */}
                {displayLead.internal_notes && (
                  <div className="p-4 rounded-lg border-2 border-muted/50 bg-muted/10" style={{ borderRadius: 'var(--radius)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="uppercase text-muted-foreground" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.05em' }}>
                        Internal Notes
                      </p>
                      <Badge variant="outline" className="text-xs">Admin Only</Badge>
                    </div>
                    <p style={{ fontSize: 'var(--text-base)', lineHeight: '1.6', color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap' }}>
                      {displayLead.internal_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions - Fixed */}
          <div className="pt-4 border-t border-border shrink-0 space-y-3">
            {isEditMode ? (
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="bg-accent hover:bg-accent/90">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            ) : (
              <>
                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCall}
                    className="h-10"
                    disabled={!displayLead.phone}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEmail}
                    className="h-10"
                    disabled={!displayLead.email}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleScheduleAppointment}
                    className="h-10"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleScheduleReminder}
                    className="h-10"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Remind
                  </Button>
                </div>

                {/* Convert to Client */}
                <Button
                  className="w-full h-11 bg-accent hover:bg-accent/90"
                  onClick={handleConvertToClient}
                  disabled={!displayLead.email}
                  title={!displayLead.email ? "Add an email address first" : undefined}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {displayLead.email ? "Convert to Client" : "Add an email to convert"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle 
              style={{ 
                fontFamily: 'var(--font-family-heading)', 
                fontVariationSettings: "'wdth' 137", 
                fontWeight: 800 
              }}
            >
              Schedule {reminderType === "visit" ? "Visit" : "Reminder"}
            </DialogTitle>
            <DialogDescription>
              Set a reminder for {lead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label style={{ fontSize: 'var(--text-label)' }}>Type</Label>
              <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call Reminder</SelectItem>
                  <SelectItem value="email">Email Reminder</SelectItem>
                  <SelectItem value="visit">Visit</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label style={{ fontSize: 'var(--text-label)' }}>Date</Label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label style={{ fontSize: 'var(--text-label)' }}>Time</Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label style={{ fontSize: 'var(--text-label)' }}>Notes</Label>
              <Textarea
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                placeholder="Add reminder notes..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsReminderDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveReminder}
                className="bg-accent hover:bg-accent/90"
              >
                Save Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}