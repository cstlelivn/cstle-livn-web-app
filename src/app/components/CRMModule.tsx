import { useState, useEffect } from "react";
import { Plus, Mail, Phone, MapPin, MessageSquare, TrendingUp, Search, Send, Grid3x3, List, Calendar, Bell, UserCheck, Clock, ExternalLink, UserPlus, Trash2, AlertCircle, Download } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Alert, AlertDescription } from "./ui/alert";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import { toast } from "sonner";
import LeadDetailsDialog from "./LeadDetailsDialog";
import ClientDialog from "./ClientDialog";
import ClientDetailsDialog from "./ClientDetailsDialog";
import LeadListView from "./LeadListView";
import { ClientListView } from "./ClientListView";
import BulkCampaignDialog from "./BulkCampaignDialog";
import { Checkbox } from "./ui/checkbox";
import { formatDateTime, formatDate, formatForInput } from "../src/lib/dateFormatter";
import { SERVICE_TYPES } from "../src/constants/serviceTypes";
import { RevenueOverview } from "./revenue/RevenueOverview";
import { SalesWorkQueue } from "./revenue/SalesWorkQueue";
import { addLeadActivity, openOrCreateEstimateFromLead } from "../src/features/revenue/api";

export default function CRMModule({ onOpenEstimate, onOpenProject }: { onOpenEstimate?: (estimateId: string) => void; onOpenProject?: (projectId: string) => void }) {
  const { hasPermission, currentUser } = useAuth();
  const { 
    leads, 
    clients, 
    addLead,
    updateLead,
    deleteLead, 
    addClient,
    updateClient, 
    deleteClient,
    convertLeadToClient,
    refreshLeads,
    refreshClients,
    isLoadingLeads,
    isLoadingClients 
  } = useApp();
  
  // Local fallback state when backend is not deployed
  const [localMode, setLocalMode] = useState(false);
  const [localLeads, setLocalLeads] = useState<any[]>([]);
  const [localClients, setLocalClients] = useState<any[]>([]);
  
  const canViewFinance = hasPermission("canViewFinance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateLeadDialogOpen, setIsCreateLeadDialogOpen] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [isBulkCampaignOpen, setIsBulkCampaignOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("leads"); // "leads" or "clients"
  const [sourceFilter, setSourceFilter] = useState<string>("all"); // "all", "contact", "booking"
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const handleOpenLeadEstimate = async (lead: any) => {
    try {
      const estimateId = await openOrCreateEstimateFromLead(lead, currentUser?.id ? String(currentUser.id) : undefined);
      if (lead.status !== 'Estimate') {
        await handleUpdateLead(lead.id, { pipeline_stage: 'Estimate', status: 'Proposal' });
        await addLeadActivity(String(lead.id), 'Estimate created and linked to this lead', currentUser?.id ? String(currentUser.id) : undefined);
      }
      setSelectedLead(null);
      onOpenEstimate?.(estimateId);
    } catch (error: any) { toast.error(error?.message || 'Could not open estimate'); }
  };
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: "lead" | "client"; name: string } | null>(null);
  
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
  });

  // Form state for new lead
  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    source: "",
    serviceType: "",
    projectDetails: "",
    estimatedValue: "",
    consultationDate: "",
    consultationTime: "",
    notes: "",
  });

  // Service types - centralized for scalability

  const leadSources = [
    "Website - Book Service",
    "Website - Contact Form",
    "Referral",
    "Social Media",
    "Event",
    "Phone Call",
    "Walk-in",
    "Other"
  ];



  const handleLeadChange = (field: string, value: string) => {
    setNewLead(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddLead = async () => {
    // A lead can be created with just a name -- everything else, including
    // email, is filled in later. Name is the one thing that's still
    // required, since a fully blank lead isn't useful.
    if (!newLead.firstName.trim() && !newLead.lastName.trim()) {
      toast.error("Enter at least a first or last name");
      return;
    }
    try {
      const leadData = {
        first_name: newLead.firstName || null,
        last_name: newLead.lastName || null,
        name: `${newLead.firstName} ${newLead.lastName}`.trim(),
        email: newLead.email || null,
        phone: newLead.phone || null,
        project_address: newLead.address || null, // Map to correct field name
        estimated_value: newLead.estimatedValue ? parseFloat(newLead.estimatedValue) : 0, // Estimated project value
        consultation_date: newLead.consultationDate || null,
        consultation_time: newLead.consultationTime || null,
        service_type: newLead.serviceType || null, // Use service_type for database
        project_details: newLead.projectDetails || null, // Use project_details for database
        company: null,
        status: "New" as const,
        source: newLead.source || null,
        notes: newLead.notes || null,
        last_contact: new Date().toISOString().split('T')[0],
      };

      const result = await addLead(leadData);
      
      toast.success("Lead added successfully!");
      
      // Reset form
      setNewLead({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        source: "",
        serviceType: "",
        projectDetails: "",
        estimatedValue: "",
        consultationDate: "",
        consultationTime: "",
        notes: "",
      });
      
      setIsCreateLeadDialogOpen(false);
      
      // Force refresh leads to ensure we get the latest data
      await refreshLeads();
    } catch (error) {
      // Surface the real error instead of a generic message -- a hidden
      // real message here is exactly what let the missing estimated_value
      // column go unnoticed for a long time.
      toast.error(error instanceof Error ? error.message : "Failed to add lead");
    }
  };

  const handleConvertToClient = async (leadId: number) => {
    try {
      await convertLeadToClient(leadId);
      
      // Refresh both leads and clients to show updated data
      await refreshLeads();
      await refreshClients();
      
      toast.success("Lead successfully converted to client!");
      
      // Close the lead details dialog
      setSelectedLead(null);
      
      // Switch to clients tab to show the new client
      setActiveTab("clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to convert lead to client");
    }
  };

  const handleAddClient = async (clientData: any) => {
    try {
      await addClient(clientData);
      await refreshClients();
    } catch (error) {
      toast.error("Failed to add client");
    }
  };

  const handleDeleteLead = (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete({ id, type: "lead", name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteClient = (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemToDelete({ id, type: "client", name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === "lead") {
        await deleteLead(itemToDelete.id);
        await refreshLeads();
        toast.success("Lead deleted successfully");
        if (selectedLead?.id === itemToDelete.id) {
          setSelectedLead(null);
        }
      } else {
        await deleteClient(itemToDelete.id);
        await refreshClients();
        toast.success("Client deleted successfully");
        if (selectedClient?.id === itemToDelete.id) {
          setSelectedClient(null);
        }
      }
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast.error(`Failed to delete ${itemToDelete.type}`);
    }
  };

  // Format "HH:MM" to 12-hr AM/PM for CSV
  const fmt12hrCSV = (t: string | undefined) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (isNaN(h)) return t;
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Safely escape a cell value for CSV
  const csvCell = (v: string | number | null | undefined) =>
    String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');

  // Export leads to CSV
  const exportLeadsToCSV = () => {
    const headers = [
      'Name', 'Email', 'Phone', 'Status', 'Source', 'Source Page', 'Form Type',
      'Province', 'Project Address', 'Service Type',
      'Consultation Date', 'Consultation Time',
      'Project Details', 'Submitted Date', 'Internal Notes',
    ];
    const csvData = filteredLeads.map((lead: any) => [
      csvCell(lead.name),
      csvCell(lead.email),
      csvCell(lead.phone),
      csvCell(lead.status),
      csvCell(lead.source),
      csvCell(lead.source_page),
      csvCell(lead.source_form === 'booking' ? 'Booking Request' : lead.source_form === 'contact' ? 'Contact Form' : lead.source_form),
      csvCell(lead.province),
      csvCell(lead.project_address || lead.address),
      csvCell(lead.service_type || lead.project_type || lead.project_interest),
      csvCell(lead.consultation_date ? lead.consultation_date.split('T')[0] : ''),
      csvCell(fmt12hrCSV(lead.consultation_time)),
      csvCell(lead.project_details || lead.message || lead.project_description),
      csvCell(lead.dateAdded ? formatDateTime(lead.dateAdded) : ''),
      csvCell(lead.internal_notes),
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${formatForInput(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLeads.length} leads to CSV`);
  };

  // Export clients to CSV
  const exportClientsToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Total Value', 'Active Projects', 'Date Added', 'Last Contact', 'Notes'];
    const csvData = filteredClients.map(client => [
      client.name || '',
      client.email || '',
      client.phone || '',
      client.status || '',
      client.totalValue?.toString() || '0',
      client.activeProjects?.toString() || '0',
      client.dateAdded ? formatDateTime(client.dateAdded) : '',
      client.lastContact ? formatDateTime(client.lastContact) : '',
      (client.notes || '').replace(/\"/g, '""'), // Escape quotes in notes
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${formatForInput(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredClients.length} clients to CSV`);
  };

  const handleUpdateLead = async (leadId: number, updates: Partial<any>) => {
    try {
      console.log('🔄 Updating lead with data:', { leadId, updates });
      
      // Map the updates from the dialog format to the API format
      const mappedUpdates: any = {};
      
      // Only include fields that were actually updated
      if (updates.name !== undefined) mappedUpdates.name = updates.name;
      if (updates.email !== undefined) mappedUpdates.email = updates.email;
      if (updates.phone !== undefined) mappedUpdates.phone = updates.phone;
      if (updates.status !== undefined) mappedUpdates.status = updates.status;
      if (updates.pipeline_stage !== undefined) mappedUpdates.pipeline_stage = updates.pipeline_stage;
      if (updates.qualification_answers !== undefined) mappedUpdates.qualification_answers = updates.qualification_answers;
      if (updates.qualification_score !== undefined) mappedUpdates.qualification_score = updates.qualification_score;
      if (updates.qualification_band !== undefined) mappedUpdates.qualification_band = updates.qualification_band;
      if (updates.qualification_reasons !== undefined) mappedUpdates.qualification_reasons = updates.qualification_reasons;
      if (updates.owner_user_id !== undefined) mappedUpdates.owner_user_id = updates.owner_user_id;
      if (updates.source !== undefined) mappedUpdates.source = updates.source;
      if (updates.project_address !== undefined) mappedUpdates.project_address = updates.project_address;
      if (updates.province !== undefined) mappedUpdates.province = updates.province;
      if (updates.estimated_value !== undefined) mappedUpdates.estimated_value = updates.estimated_value;
      if (updates.internal_notes !== undefined) mappedUpdates.internal_notes = updates.internal_notes;
      if (updates.consultation_date !== undefined) mappedUpdates.consultation_date = updates.consultation_date;
      if (updates.consultation_time !== undefined) mappedUpdates.consultation_time = updates.consultation_time;
      if (updates.service_type !== undefined) mappedUpdates.service_type = updates.service_type;
      if (updates.project_type !== undefined) mappedUpdates.project_type = updates.project_type;
      if (updates.project_details !== undefined) mappedUpdates.project_details = updates.project_details;
      if (updates.message !== undefined) mappedUpdates.message = updates.message;
      if (updates.links !== undefined) mappedUpdates.links = updates.links;
      if (updates.last_contact !== undefined) mappedUpdates.last_contact = updates.last_contact;
      
      // Backwards compatibility: if notes is provided but internal_notes isn't, use notes for internal_notes
      if (updates.notes !== undefined && updates.internal_notes === undefined) {
        mappedUpdates.internal_notes = updates.notes;
      }
      
      console.log('📤 Sending to API:', mappedUpdates);
      
      await updateLead(leadId, mappedUpdates);

      // Inline Revenue OS actions (owner, Project Fit, stage/scheduling)
      // should keep the workspace open. Merge the saved values immediately;
      // the subsequent refresh reconciles the shared CRM list.
      setSelectedLead((current: any) => current ? {
        ...current,
        ...updates,
        status: updates.pipeline_stage ?? updates.status ?? current.status,
      } : current);

      toast.success("Lead updated");
      
      // Refresh leads to reflect changes including pipeline
      await refreshLeads();
      
      console.log('✅ Lead updated successfully');
    } catch (error) {
      console.error('❌ Error updating lead:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update lead");
      throw error;
    }
  };

  const handleUpdateClient = async (clientId: number, updates: Partial<any>) => {
    try {
      await updateClient(clientId, updates);
      toast.success("Client updated successfully!");
      
      // Close the dialog
      setSelectedClient(null);
      
      // Refresh clients to reflect changes
      await refreshClients();
    } catch (error) {
      toast.error("Failed to update client");
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "New") return "bg-accent/10 text-accent";
    if (status === "Contacted") return "bg-primary/10 text-primary";
    if (status === "Proposal") return "bg-primary text-primary-foreground";
    if (status === "Won") return "bg-success/10 text-success";
    if (status === "Lost") return "bg-destructive/10 text-destructive";
    if (status === "Active") return "bg-primary/10 text-primary";
    return "bg-muted/10 text-muted-foreground";
  };

  // Transform leads to match the display structure
  const transformedLeads = leads.map(lead => ({
    id: lead.id,
    name: lead.name,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    project_address: lead.project_address, // CORRECT FIELD NAME
    address: lead.project_address, // For backwards compatibility with dialog
    estimated_value: lead.estimated_value || 0, // Estimated project value
    value: lead.estimated_value || 0, // For backwards compatibility
    consultation_date: lead.consultation_date,
    consultationDate: lead.consultation_date, // For backwards compatibility
    project_interest: (lead as any).project_interest,
    project_description: (lead as any).project_description,
    interest: lead.service_type || lead.project_type, // For backwards compatibility
    source: lead.source,
    source_form: lead.source_form, // 'contact' or 'booking'
    source_page: lead.source_page, // Source page URL
    service_type: lead.service_type, // for booking form
    project_type: lead.project_type, // alternative field
    project_details: lead.project_details, // for booking form (customer message)
    message: lead.message, // for contact form (customer message)
    links: lead.links, // URLs submitted by user
    company: lead.company,
    // Normalize legacy status values (pre-dating the New/Contacted/Proposal/Won/Lost
    // pipeline vocabulary) so old leads display and filter consistently with new ones.
    status: (lead as any).pipeline_stage || (() => {
      const s = (lead.status || "").toLowerCase();
      if (s === "new" || s === "new lead") return "New";
      if (s === "converted" || s === "won") return "Won";
      if (s === "closed" || s === "lost") return "Lost";
      return lead.status;
    })(),
    pipeline_stage: (lead as any).pipeline_stage,
    qualification_band: (lead as any).qualification_band,
    qualification_score: (lead as any).qualification_score,
    qualification_reasons: (lead as any).qualification_reasons,
    qualification_answers: (lead as any).qualification_answers,
    owner_user_id: (lead as any).owner_user_id,
    created_at: lead.created_at,
    first_responded_at: (lead as any).first_responded_at,
    won_at: (lead as any).won_at,
    utm_source: (lead as any).utm_source,
    utm_medium: (lead as any).utm_medium,
    utm_campaign: (lead as any).utm_campaign,
    gclid: (lead as any).gclid,
    fbclid: (lead as any).fbclid,
    landing_page: (lead as any).landing_page,
    referrer: (lead as any).referrer,
    city: (lead as any).city,
    notes: lead.internal_notes || lead.notes, // Admin internal notes (prefer internal_notes)
    internal_notes: lead.internal_notes, // Admin-only internal notes
    dateAdded: lead.created_at,
    lastContact: lead.last_contact,
  }));

  // Filter and sort leads
  const filteredLeads = transformedLeads
    .filter((lead) => {
      const matchesSearch = !filters.search ||
        lead.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        lead.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        (lead.project_interest && lead.project_interest.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesStatus = !filters.selects?.status ||
        filters.selects.status === "all" ||
        lead.status === filters.selects.status;
      
      const matchesSource = !filters.selects?.source ||
        filters.selects.source === "all" ||
        lead.source === filters.selects.source;
      
      // Filter by source form (contact/booking)
      const matchesSourceForm = sourceFilter === "all" ||
        (sourceFilter === "contact" && lead.source_form === "contact") ||
        (sourceFilter === "booking" && lead.source_form === "booking");
      
      const matchesDateFrom = !filters.dateFrom ||
        new Date(lead.dateAdded) >= new Date(filters.dateFrom);
      
      const matchesDateTo = !filters.dateTo ||
        new Date(lead.dateAdded) <= new Date(filters.dateTo);
      
      return matchesSearch && matchesStatus && matchesSource && matchesSourceForm && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.name.localeCompare(b.name);
        case "value":
          return order * (a.value - b.value);
        case "dateAdded":
          return order * (new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
        case "status":
          return order * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Transform clients to match the display structure
  const transformedClients = clients.map((client: any) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company || "",
    projects: [], // Would need to calculate from projects
    totalSpent: client.total_value || 0,
    totalValue: client.total_value || 0, // Match schema field
    status: client.status,
    source: client.source,
    notes: client.notes,
    satisfaction: 0, // Add if you want to track satisfaction
    created_at: client.created_at, // Use created_at instead of joinDate
    dateAdded: client.created_at,
    lastContact: client.last_contact,
  }));

  // Filter and sort clients
  const filteredClients = transformedClients
    .filter((client) => {
      const matchesSearch = !filters.search ||
        client.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        client.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesStatus = !filters.selects?.status ||
        filters.selects.status === "all" ||
        client.status === filters.selects.status;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.name.localeCompare(b.name);
        case "totalSpent":
          return order * (a.totalSpent - b.totalSpent);
        case "satisfaction":
          return order * (a.satisfaction - b.satisfaction);
        case "created_at":
          return order * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        default:
          return 0;
      }
    });


  // Selection handlers for bulk operations
  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(lead => lead.id));
    }
  };

  const clearSelection = () => {
    setSelectedLeadIds([]);
  };

  const selectedLeads = filteredLeads.filter(lead => selectedLeadIds.includes(lead.id));

  // Filter configuration for leads
  const leadsFilterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name, email, interest...",
    },
    {
      type: "date",
      field: "dateRange",
      label: "Date Range",
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "New", label: "New" },
        { value: "Contacted", label: "Contacted" },
        { value: "Qualified", label: "Qualified" },
        { value: "Consultation Booked", label: "Consultation Booked" },
        { value: "Site Visit", label: "Site Visit" },
        { value: "Estimate", label: "Estimate" },
        { value: "Won", label: "Won" },
        { value: "Lost", label: "Lost" },
      ],
    },
    {
      type: "select",
      field: "source",
      label: "Source",
      options: leadSources.map(source => ({ value: source, label: source })),
    },
  ];

  // Filter configuration for clients
  const clientsFilterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name, email, company...",
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "Active", label: "Active" },
        { value: "Past", label: "Past" },
      ],
    },
  ];

  // Sort options for leads
  const leadsSortOptions: SortOption[] = [
    { field: "name", label: "Name" },
    { field: "value", label: "Est. Value" },
    { field: "dateAdded", label: "Date Added" },
    { field: "status", label: "Status" },
  ];

  // Sort options for clients
  const clientsSortOptions: SortOption[] = [
    { field: "name", label: "Name" },
    ...(canViewFinance ? [{ field: "totalSpent", label: "Total Spent" }] : []),
    { field: "satisfaction", label: "Satisfaction" },
    { field: "created_at", label: "Date Added" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap">
          <Dialog open={isCreateLeadDialogOpen} onOpenChange={setIsCreateLeadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Add a new lead to your CRM pipeline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input placeholder="Enter first name" value={newLead.firstName} onChange={(e) => handleLeadChange("firstName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input placeholder="Enter last name" value={newLead.lastName} onChange={(e) => handleLeadChange("lastName", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@example.com" value={newLead.email} onChange={(e) => handleLeadChange("email", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" placeholder="(555) 123-4567" value={newLead.phone} onChange={(e) => handleLeadChange("phone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Lead Source</Label>
                    <Select value={newLead.source} onValueChange={(value) => handleLeadChange("source", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service Type</Label>
                    <Select value={newLead.serviceType} onValueChange={(value) => handleLeadChange("serviceType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Value ($)</Label>
                    <Input type="number" placeholder="25000" value={newLead.estimatedValue} onChange={(e) => handleLeadChange("estimatedValue", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Project Address</Label>
                  <Input placeholder="Enter the project address" value={newLead.address} onChange={(e) => handleLeadChange("address", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Consultation Date</Label>
                    <Input type="date" value={newLead.consultationDate} onChange={(e) => handleLeadChange("consultationDate", e.target.value)} />
                  </div>
                  <div>
                    <Label>Consultation Time</Label>
                    <Input type="time" value={newLead.consultationTime} onChange={(e) => handleLeadChange("consultationTime", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Project Details</Label>
                  <Input placeholder="Brief description of the project" value={newLead.projectDetails} onChange={(e) => handleLeadChange("projectDetails", e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Any additional information..." rows={3} value={newLead.notes} onChange={(e) => handleLeadChange("notes", e.target.value)} />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="secondary" onClick={() => setIsCreateLeadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLead}>
                    Add Lead
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline"
            onClick={() => {
              if (selectedLeads.length === 0) {
                toast.error("Please select at least one lead");
                return;
              }
              // Check if all selected leads have email addresses
              const leadsWithoutEmail = selectedLeads.filter(lead => !lead.email);
              if (leadsWithoutEmail.length > 0) {
                toast.error(`${leadsWithoutEmail.length} selected lead(s) have no email address`);
                return;
              }
              setIsBulkCampaignOpen(true);
            }}
            disabled={selectedLeads.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            Bulk Campaign {selectedLeads.length > 0 && `(${selectedLeads.length})`}
          </Button>
        </div>
      </div>

      <RevenueOverview leads={transformedLeads} onStage={(stage) => { setActiveTab('leads'); setFilters((prev) => ({ ...prev, selects: { ...prev.selects, status: stage } })); }} />
      <SalesWorkQueue leads={transformedLeads} onOpenLead={setSelectedLead} />

      {/* Main Toggle: Leads vs Clients + Filters */}
      <div className="flex items-center justify-between gap-[12px] flex-wrap">
        <div className="flex items-center gap-[12px] flex-wrap">
          {/* Toggle between Leads and Clients */}
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(value) => value && setActiveTab(value as "leads" | "clients")}
            className="border rounded-lg bg-card"
          >
            <ToggleGroupItem value="leads" className="px-4 py-2">
              All Leads ({transformedLeads.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="clients" className="px-4 py-2">
              Clients ({transformedClients.length})
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Show source filter only for Leads tab */}
          {activeTab === "leads" && (
            <>
              <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>|</span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="contact">Contact Form</SelectItem>
                  <SelectItem value="booking">Book Service</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          {/* Regular filters */}
          <TableFilter
            filters={activeTab === "leads" ? leadsFilterConfig : clientsFilterConfig}
            onFilterChange={setFilters}
            searchPlaceholder={
              activeTab === "leads"
                ? "Search by name, email, interest..."
                : "Search by name, email, company..."
            }
            sortOptions={activeTab === "leads" ? leadsSortOptions : clientsSortOptions}
          />
        </div>

        {/* View Mode Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "grid" | "list")}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="grid" className="p-2">
            <Grid3x3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="p-2">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
            {activeTab === "leads" ? `${filteredLeads.length} of ${transformedLeads.length} leads` : `${filteredClients.length} clients`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={activeTab === "clients" ? exportClientsToCSV : exportLeadsToCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>

          {/* Add Client Button - Only show in Clients tab */}
          {activeTab === "clients" && (
            <Button onClick={() => setIsClientDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Leads View */}
      {activeTab === "leads" && (
        <div className="mt-6">
          {isLoadingLeads ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No leads found</p>
              <Button onClick={() => setIsCreateLeadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Lead
              </Button>
            </Card>
          ) : filteredLeads.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground mb-2">No leads match your current filters</p>
              <p className="text-muted-foreground text-sm mb-4">
                You have {leads.length} total lead{leads.length !== 1 ? 's' : ''}, but none match your search or filter criteria.
              </p>
              <Button variant="outline" onClick={() => setFilters({ search: "", dateFrom: undefined, dateTo: undefined, selects: {}, sortBy: "", sortOrder: "asc" })}>
                Clear All Filters
              </Button>
            </Card>
          ) : (
            <LeadListView
              leads={filteredLeads}
              viewMode={viewMode}
              onLeadClick={setSelectedLead}
              onDeleteLead={handleDeleteLead}
              getStatusColor={getStatusColor}
              selectedLeadIds={selectedLeadIds}
              onToggleSelection={toggleLeadSelection}
              onToggleSelectAll={toggleSelectAll}
              onStatusChange={(lead, status) => handleUpdateLead(lead.id, { pipeline_stage: status })}
            />
          )}
        </div>
      )}

      {/* Clients View */}
      {activeTab === "clients" && (
        <div className="mt-6">
          {isLoadingClients ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No clients found</p>
              <Button onClick={() => setIsClientDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            </Card>
          ) : viewMode === "list" ? (
            <ClientListView clients={filteredClients} canViewFinance={canViewFinance} onOpen={setSelectedClient} onDelete={(client, event) => handleDeleteClient(client.id, client.name, event)} onStatusChange={(client, status) => handleUpdateClient(client.id, { status })} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="p-6 relative group cursor-pointer" onClick={() => setSelectedClient(client)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="mb-1">{client.name}</h3>
                      <Badge className="bg-primary/10 text-primary">
                        {client.status}
                      </Badge>
                    </div>
                    {canViewFinance && (
                      <div className="text-right">
                        <p className="text-muted-foreground">Total Value</p>
                        <p>${client.totalSpent.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Client Since:</span>
                      <span>{formatDate(client.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Contact:</span>
                      <span>{client.lastContact ? formatDate(client.lastContact) : 'Never'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="outline" className="flex-1">
                      View History
                    </Button>
                  </div>

                  {/* Delete button - appears on hover */}
                  <button
                    onClick={(e) => handleDeleteClient(client.id, client.name, e)}
                    className="absolute top-[16px] right-[16px] p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onConvertToClient={handleConvertToClient}
        onUpdateLead={handleUpdateLead}
        onOpenEstimate={handleOpenLeadEstimate}
        onOpenClient={(clientId) => { const client = transformedClients.find((item: any) => String(item.id) === String(clientId)); if (client) { setSelectedLead(null); setSelectedClient(client); } else toast.error('Related customer could not be opened'); }}
        onOpenProject={(projectId) => { setSelectedLead(null); onOpenProject?.(projectId); }}
      />

      {/* Client Details Dialog */}
      <ClientDetailsDialog
        client={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdateClient={handleUpdateClient}
        onOpenEstimate={(estimateId) => { setSelectedClient(null); onOpenEstimate?.(estimateId); }}
        onOpenProject={(projectId) => { setSelectedClient(null); onOpenProject?.(projectId); }}
      />

      {/* Add Client Dialog */}
      <ClientDialog
        isOpen={isClientDialogOpen}
        onClose={() => setIsClientDialogOpen(false)}
        onAddClient={handleAddClient}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === "lead" ? "Lead" : "Client"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {itemToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Campaign Dialog */}
      <BulkCampaignDialog
        open={isBulkCampaignOpen}
        onOpenChange={setIsBulkCampaignOpen}
        selectedLeads={selectedLeads}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
