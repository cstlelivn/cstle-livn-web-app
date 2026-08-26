import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

// Import new PostgreSQL + Realtime hooks
import { useProjects as useProjectsRealtime } from "../src/features/projects/useProjects";
import { useTasks as useTasksRealtime } from "../src/features/tasks/useTasks";
import { useTeamMembers as useTeamRealtime } from "../src/features/team/useTeamMembers";
import { useVendors as useVendorsRealtime } from "../src/features/vendors/useVendors";
import { useClients as useClientsRealtime } from "../src/features/clients/useClients";
import { useLeads as useLeadsRealtime } from "../src/features/leads/useLeads";
import { useReminders as useRemindersData } from "../src/features/reminders/useReminders";
import { useInventory as useInventoryRealtime } from "../src/features/inventory/useInventory";
import { useTransactions as useTransactionsRealtime } from "../src/features/transactions/useTransactions";

// Import API functions for CRUD operations
import * as projectsAPI from "../src/features/projects/api";
import * as tasksAPI from "../src/features/tasks/api";
import * as teamAPI from "../src/features/team/api";
import * as vendorsAPI from "../src/features/vendors/api";
import * as clientsAPI from "../src/features/clients/api";
import * as leadsAPI from "../src/features/leads/api";
import * as remindersAPI from "../src/features/reminders/api";
import * as inventoryAPI from "../src/features/inventory/api";
import * as transactionsAPI from "../src/features/transactions/api";

// Types
export interface PhaseWithDuration {
  name: string;
  days: number;
  startDate?: string; // Calculated start date for this phase
  endDate?: string; // Calculated end date for this phase
}

export interface Project {
  id: number;
  title: string;
  client: string;
  location: string;
  budget: number;
  spent: number;
  progress: number;
  status: "Planning" | "In Progress" | "On Hold" | "Completed" | "Delayed";
  phase: string;
  phases: PhaseWithDuration[]; // Custom phases with durations for this specific project
  startDate: string;
  endDate: string;
  description: string;
  team: number[]; // Team member IDs
  color: string;
  budget_total?: number; // NEW: Total project budget
  budget_spent?: number; // NEW: Total amount spent
  budget_remaining?: number; // NEW: Remaining budget (calculated)
  budget_status?: string; // NEW: Budget status (On Track, Warning, At Risk, Over Budget)
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Under Review" | "Pending QC" | "Completed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee: string; // Team member UUID (string)
  dueDate: string;
  progress: number;
  tags: string[];
  phase?: string; // Phase this task belongs to
  createdAt: string;
  completedDate?: string; // Date when marked as completed
  reviewFeedback?: string; // QC feedback if rejected
  rating?: number; // Task rating after QC approval (0-5)
  ratingMetrics?: {
    speed: "fast" | "on-time" | "slow";
    corrections: "none" | "minor" | "major";
  };
}

export interface PhaseQCReview {
  id: number;
  projectId: number;
  phaseName: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedBy: number; // Team member ID who completed last task
  submittedAt: string;
  reviewedBy?: number; // Manager/Admin ID who reviewed
  reviewedAt?: string;
  feedback?: string;
  notes?: string;
  tasksCompleted: number; // Snapshot of how many tasks were completed
  tasksTotal: number; // Snapshot of total tasks in phase
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  auraRating: number; // 0-5
  tasksCompleted: number;
  tasksOnTime: number;
  efficiency: number; // percentage
  specialties: string[];
  active: boolean;
}

export interface Vendor {
  id: number;
  name: string;
  category: string;
  rating: number; // 0-5
  totalProjects: number;
  onTimeDelivery: number; // percentage
  qualityScore: number; // 0-5
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  services: string[];
  website?: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: "Lead" | "Active" | "Past" | "Lost";
  projectsCount: number;
  totalValue: number;
  source: string;
  notes: string;
  lastContact: string;
}

export interface Lead {
  id: number;
  source_form?: string; // 'contact' or 'booking'
  source_page?: string; // Source page URL from website form
  first_name?: string; // First name from website form
  last_name?: string; // Last name from website form
  name: string; // Full name (computed from first_name + last_name)
  email: string;
  phone?: string;
  project_address?: string; // Project address from website form
  consultation_date?: string; // Preferred consultation date from website
  service_type?: string; // Service type from booking form
  project_type?: string; // Alternative service type field
  project_details?: string; // Project details from booking form
  message?: string; // Message from contact form (customer message)
  links?: string; // URLs submitted by user
  company?: string;
  status: "New Lead" | "Contacted" | "Proposal" | "Converted" | "converted" | "Closed" | "Lost";
  source: string; // "Website - Book Service", "Website - Contact Form", "Referral", etc.
  notes?: string; // Internal admin notes (backwards compatibility)
  internal_notes?: string; // Internal admin notes (admin-only field)
  created_at: string; // Timestamp when lead was created
  updated_at?: string; // Timestamp when lead was last updated
  last_contact?: string; // Last time admin contacted this lead
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  type: "Equipment" | "Consumable"; // Equipment = Tools, Consumable = Materials
  quantity: number;
  unit: string;
  minStock: number;
  cost: number;
  supplier: number; // Vendor ID
  location: string;
  lastRestocked?: string;
  lastUsed?: string;
  assignedTo?: string; // Team member name for equipment
  status?: string; // "In Stock", "Low Stock", "Critical", "Available", "In Use"
  condition?: string; // For equipment: "Excellent", "Good", "Fair", "Poor"
}

export interface Transaction {
  id: number;
  projectId?: number;
  type: "Income" | "Expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  vendor?: number; // Vendor ID
  status: "Pending" | "Completed" | "Cancelled";
  phaseName?: string; // Phase this expense belongs to (for project expenses)
}

export interface Activity {
  id: number;
  userId: string;
  action: string;
  target: string;
  targetId?: number;
  timestamp: string;
  type: "project" | "task" | "team" | "vendor" | "client" | "finance" | "inventory";
}

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  tags: string[];
  createdAt: string;
}

export interface Reminder {
  id: number;
  leadId?: number;
  clientId?: number;
  leadName?: string;
  clientName?: string;
  contactEmail?: string;
  contactPhone?: string;
  type: "call" | "email" | "appointment" | "follow-up";
  date: string;
  time: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

interface AppContextType {
  // Data
  projects: Project[];
  tasks: Task[];
  teamMembers: TeamMember[];
  vendors: Vendor[];
  clients: Client[];
  leads: Lead[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  activities: Activity[];
  taskTemplates: TaskTemplate[];
  reminders: Reminder[];
  phaseQCReviews: PhaseQCReview[];

  // Loading states
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isLoadingTeam: boolean;
  isLoadingVendors: boolean;
  isLoadingClients: boolean;
  isLoadingLeads: boolean;
  isLoadingInventory: boolean;
  isLoadingTransactions: boolean;

  // Refresh methods (for manual refresh if needed)
  refreshProjects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshTeam: () => Promise<void>;
  refreshVendors: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshTaskTemplates: () => Promise<void>;

  // Project methods
  addProject: (project: Omit<Project, "id">) => Promise<void>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  getProject: (id: number) => Project | undefined;

  // Task methods
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<any>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  getTasksByProject: (projectId: number) => Task[];

  // Task Template methods
  saveTaskTemplate: (template: Omit<TaskTemplate, "id" | "createdAt">) => Promise<void>;
  deleteTaskTemplate: (id: string) => Promise<void>;

  // Team methods
  addTeamMember: (member: Omit<TeamMember, "id">) => Promise<void>;
  updateTeamMember: (id: number, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: number) => Promise<void>;
  deleteTeamMemberAndReassign: (id: number, reassignToId: number) => Promise<{ deletedName: string; reassignedTaskCount: number; reassignedTo: string }>;
  getTeamMember: (id: number | string) => TeamMember | undefined;

  // Vendor methods
  addVendor: (vendor: Omit<Vendor, "id">) => Promise<void>;
  updateVendor: (id: number, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: number) => Promise<void>;

  // Client methods
  addClient: (client: Omit<Client, "id">) => Promise<void>;
  updateClient: (id: number, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  // Lead methods
  addLead: (lead: Omit<Lead, "id">) => Promise<void>;
  updateLead: (id: number, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
  convertLeadToClient: (leadId: number) => Promise<void>;

  // Inventory methods
  addInventoryItem: (item: Omit<InventoryItem, "id">) => Promise<void>;
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: number) => Promise<void>;

  // Transaction methods
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  // Reminder methods
  addReminder: (reminder: Omit<Reminder, "id" | "createdAt" | "completed">) => Promise<void>;
  completeReminder: (id: number) => Promise<void>;
  deleteReminder: (id: number) => Promise<void>;

  // External links
  googleReviewsUrl: string;
  websiteUrl: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, hasPermission } = useAuth();

  // ✅ NEW: Using PostgreSQL + Realtime hooks instead of KV store

  // Use realtime hooks with permission checks
  const {
    projects: realtimeProjects,
    loading: isLoadingProjects,
    refresh: refreshProjectsHook,
    mergeProject,
    removeProject,
  } = useProjectsRealtime(hasPermission("canViewProjects"), user?.role || '', user?.id || '');

  const {
    tasks: realtimeTasks,
    loading: isLoadingTasks,
    refresh: refreshTasksHook,
    mergeTask,
    removeTask,
  } = useTasksRealtime(hasPermission("canViewProjects"), user?.role || '', user?.id || '');

  // Always enabled, regardless of canViewTeam: every signed-in person needs
  // their own team_member record loaded for basic self-identification (task
  // ownership matching, "who am I" lookups) even when they can't see the
  // full Team management page. Gating this fetch on canViewTeam broke task
  // ownership resolution for any role without that permission -- their own
  // assigned tasks/projects silently vanished everywhere in the app, not
  // just on the Team page (which has its own separate visibility gate).
  const {
    teamMembers: realtimeTeam,
    loading: isLoadingTeam,
    refresh: refreshTeamHook,
  } = useTeamRealtime(true);

  const {
    vendors: realtimeVendors,
    loading: isLoadingVendors,
    refresh: refreshVendorsHook,
  } = useVendorsRealtime(hasPermission("canViewVendors"));

  const {
    clients: realtimeClients,
    loading: isLoadingClients,
    refresh: refreshClientsHook,
  } = useClientsRealtime(hasPermission("canViewCRM"));

  const {
    leads: realtimeLeads,
    loading: isLoadingLeads,
    refresh: refreshLeadsHook,
  } = useLeadsRealtime(hasPermission("canViewCRM"));

  const {
    reminders: dbReminders,
    refresh: refreshRemindersHook,
  } = useRemindersData(hasPermission("canViewCRM"));

  const {
    inventory: realtimeInventory,
    loading: isLoadingInventory,
    refresh: refreshInventoryHook,
  } = useInventoryRealtime(hasPermission("canViewInventory"));

  const {
    transactions: realtimeTransactions,
    loading: isLoadingTransactions,
    refresh: refreshTransactionsHook,
  } = useTransactionsRealtime(hasPermission("canViewFinance"));

  // Local state for data not yet migrated to PostgreSQL
  const [activities, setActivities] = useState<Activity[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [phaseQCReviews, setPhaseQCReviews] = useState<PhaseQCReview[]>([]);

  // Reminders are real, database-backed (crm_reminders) -- see
  // useRemindersData above. Transformed here from snake_case DB rows into
  // the camelCase Reminder shape the rest of the app (NotificationBell,
  // LeadDetailsDialog) already expects.
  const reminders: Reminder[] = dbReminders.map((r: any) => ({
    id: r.id,
    leadId: r.lead_id ?? undefined,
    clientId: r.client_id ?? undefined,
    leadName: r.lead_name ?? undefined,
    clientName: r.client_name ?? undefined,
    contactEmail: r.contact_email ?? undefined,
    contactPhone: r.contact_phone ?? undefined,
    type: r.type,
    date: r.due_date,
    time: r.due_time ?? "",
    notes: r.notes ?? undefined,
    completed: r.completed,
    createdAt: r.created_at,
  }));

  // External URLs
  const googleReviewsUrl = "https://www.google.com/maps/search/Cstle+Livn/@40.7128,-74.0060,15z";
  const websiteUrl = "https://cstlelivn.com";

  // Load local data on mount (for features not yet migrated to PostgreSQL)
  useEffect(() => {
    // Load task templates from localStorage
    const savedTemplates = localStorage.getItem("task_templates");
    if (savedTemplates) {
      try {
        setTaskTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        // Silently ignore errors
      }
    }

  }, []);

  // Refresh methods (manual refresh if needed, though realtime handles automatic updates)
  const refreshProjects = async () => {
    if (!hasPermission("canViewProjects")) return;
    await refreshProjectsHook();
  };

  const refreshTasks = async () => {
    if (!hasPermission("canViewProjects")) return;
    await refreshTasksHook();
  };

  const refreshTeam = async () => {
    if (!hasPermission("canViewTeam")) return;
    await refreshTeamHook();
  };

  const refreshVendors = async () => {
    if (!hasPermission("canViewVendors")) return;
    await refreshVendorsHook();
  };

  const refreshClients = async () => {
    if (!hasPermission("canViewCRM")) return;
    await refreshClientsHook();
  };

  const refreshLeads = async () => {
    if (!hasPermission("canViewCRM")) return;
    await refreshLeadsHook();
  };

  const refreshInventory = async () => {
    if (!hasPermission("canViewInventory")) return;
    await refreshInventoryHook();
  };

  const refreshTransactions = async () => {
    if (!hasPermission("canViewFinance")) return;
    await refreshTransactionsHook();
  };

  const refreshActivities = async () => {
    // TODO: Implement activities refresh when migrated to PostgreSQL
  };

  const refreshTaskTemplates = async () => {
    const saved = localStorage.getItem("task_templates");
    if (saved) {
      setTaskTemplates(JSON.parse(saved));
    }
  };

  // Project methods
  const addProject = async (project: Omit<Project, "id">) => {
    try {
      const created = await projectsAPI.createProject(project);
      if (created) mergeProject(created);
    } catch (error) {
      throw error;
    }
  };

  const updateProject = async (id: number, updates: Partial<Project>) => {
    const previous = realtimeProjects.find((project: any) => String(project.id) === String(id));
    try {
      if (previous) mergeProject({ ...previous, ...updates, id });
      await projectsAPI.updateProject(String(id), updates);
    } catch (error) {
      if (previous) mergeProject(previous);
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: number) => {
    const previous = realtimeProjects.find((project: any) => String(project.id) === String(id));
    try {
      removeProject(id);
      await projectsAPI.deleteProject(id);
    } catch (error) {
      if (previous) mergeProject(previous);
      throw error;
    }
  };

  const getProject = (id: number) => {
    const found = realtimeProjects.find((p) => p.id === id);
    return found;
  };

  // Task methods
  const addTask = async (task: Omit<Task, "id" | "createdAt">) => {
    try {
      const project = realtimeProjects.find((p: any) => String(p.id) === String(task.projectId));
      if (!project) {
        throw new Error("Choose a valid project before creating the task");
      }
      if (project.status === "Completed" && !(task as any).is_warranty) {
        throw new Error("This project is closed. New tasks cannot be added.");
      }

      // Planning and assignment are separate. A Manager/Admin/Supervisor may
      // create an unassigned task, set its scope and estimate, and choose the
      // actual worker later. Never silently turn the project Supervisor into
      // the worker: supervision controls oversight/QC, while task_assignees
      // controls who can start the timer and perform the work.
      const rawAssignee = (task as any).assignee_id ?? task.assignee;
      const assignee = rawAssignee && rawAssignee !== "unassigned" ? rawAssignee : "";

      const result = await tasksAPI.createTask({
        ...task,
        assignee,
        assignee_id: assignee,
        createdAt: new Date().toISOString(),
      } as any);

      if (result) mergeTask(result);
      return result;
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw error;
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    const previous = realtimeTasks.find((task: any) => String(task.id) === String(id));
    try {
      if (previous) mergeTask({ ...previous, ...updates, id });
      await tasksAPI.updateTask(id, updates);
    } catch (error) {
      if (previous) mergeTask(previous);
      console.error('❌ Failed to update task:', error);
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    const previous = realtimeTasks.find((task: any) => String(task.id) === String(id));
    try {
      removeTask(id);
      await tasksAPI.deleteTask(id);
    } catch (error) {
      if (previous) mergeTask(previous);
      console.error('❌ Failed to delete task:', error);
      throw error;
    }
  };

  const getTasksByProject = (projectId: number) => {
    // Convert projectId to string for comparison since database uses UUIDs
    const projectIdStr = String(projectId);
    
    const filtered = realtimeTasks.filter((t) => {
      const taskProjectIdStr = String(t.projectId);
      return taskProjectIdStr === projectIdStr;
    });
    
    return filtered;
  };

  // Task Template methods
  const saveTaskTemplate = async (template: Omit<TaskTemplate, "id" | "createdAt">) => {
    const newTemplate: TaskTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...taskTemplates, newTemplate];
    setTaskTemplates(updated);
    localStorage.setItem("task_templates", JSON.stringify(updated));
  };

  const deleteTaskTemplate = async (id: string) => {
    const updated = taskTemplates.filter((t) => t.id !== id);
    setTaskTemplates(updated);
    localStorage.setItem("task_templates", JSON.stringify(updated));
  };

  // Team methods
  const addTeamMember = async (member: Omit<TeamMember, "id">) => {
    try {
      await teamAPI.createTeamMember(member);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateTeamMember = async (id: number, updates: Partial<TeamMember>) => {
    try {
      await teamAPI.updateTeamMember(String(id), updates);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteTeamMember = async (id: number) => {
    try {
      await teamAPI.deleteTeamMember(String(id));
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteTeamMemberAndReassign = async (id: number, reassignToId: number) => {
    const result = await teamAPI.deleteTeamMemberAndReassign(String(id), String(reassignToId));
    // Realtime hook will automatically update the list
    return result;
  };

  const getTeamMember = (id: number | string) => {
    // Convert to string for comparison since database IDs are UUIDs (strings)
    const idStr = String(id);
    return realtimeTeam.find((m) => String(m.id) === idStr);
  };

  // Vendor methods
  const addVendor = async (vendor: Omit<Vendor, "id">) => {
    try {
      await vendorsAPI.createVendor(vendor);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateVendor = async (id: number, updates: Partial<Vendor>) => {
    try {
      await vendorsAPI.updateVendor(id, updates);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteVendor = async (id: number) => {
    try {
      await vendorsAPI.deleteVendor(id);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  // Client methods
  const addClient = async (client: Omit<Client, "id">) => {
    try {
      await clientsAPI.createClient(client);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateClient = async (id: number, updates: Partial<Client>) => {
    try {
      await clientsAPI.updateClient(id, updates);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteClient = async (id: number) => {
    try {
      await clientsAPI.deleteClient(id);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  // Lead methods
  const addLead = async (lead: Omit<Lead, "id">) => {
    try {
      await leadsAPI.createLead(lead);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    try {
      await leadsAPI.updateLead(id, updates);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteLead = async (id: number) => {
    try {
      await leadsAPI.deleteLead(id);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const convertLeadToClient = async (leadId: number) => {
    try {
      const lead = realtimeLeads.find((l) => l.id === leadId);
      if (!lead) throw new Error("Lead not found");
      // A lead can be created with just a name (email filled in later), but
      // a client record still needs a real contact method -- clients.email
      // stays required at the database level.
      if (!lead.email || !lead.email.trim()) {
        throw new Error("Add an email address for this lead before converting to a client");
      }

      // EXACT mapping as specified in requirements:
      // clients.name = if leads.name exists use it, else combine first_name + last_name
      const clientName = lead.name && lead.name.trim()
        ? lead.name
        : `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown';

      // clients.source = based on source_form
      let clientSource = 'Website';
      if (lead.source_form === 'booking') {
        clientSource = 'Website - Booking';
      } else if (lead.source_form === 'contact') {
        clientSource = 'Website - Contact';
      } else if (lead.source_page) {
        clientSource = lead.source_page;
      } else if (lead.source) {
        clientSource = lead.source;
      }

      // clients.notes = internal_notes || project_details || message
      const clientNotes = lead.internal_notes || lead.project_details || lead.message || '';

      // Create client from lead with exact field mapping
      const clientData: any = {
        name: clientName,
        email: lead.email,
        phone: lead.phone || null,
        status: 'Active',
        projects_count: 0,
        total_value: 0,
        source: clientSource,
        notes: clientNotes,
        last_contact: null, // Initially null, admin will update when they contact
      };

      console.log('🔄 Converting lead to client:', { lead, clientData });

      await addClient(clientData);
      // "Won" matches the CRM pipeline vocabulary (New/Contacted/Proposal/
      // Won/Lost) -- the lead stays visible in the leads list afterward
      // (listLeads no longer hides it) so a won deal remains auditable.
      await updateLead(leadId, { status: "Won" });

      console.log('✅ Lead converted to client successfully');
    } catch (error) {
      console.error('❌ Error converting lead to client:', error);
      throw error;
    }
  };

  // Inventory methods
  const addInventoryItem = async (item: Omit<InventoryItem, "id">) => {
    try {
      await inventoryAPI.createInventoryItem(item as any);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateInventoryItem = async (id: number, updates: Partial<InventoryItem>) => {
    try {
      await inventoryAPI.updateInventoryItem(id as any, updates as any);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteInventoryItem = async (id: number) => {
    try {
      await inventoryAPI.deleteInventoryItem(id as any);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  // Transaction methods
  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    try {
      await transactionsAPI.createTransaction(transaction);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
    try {
      await transactionsAPI.updateTransaction(id, updates);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      await transactionsAPI.deleteTransaction(id);
      // Realtime hook will automatically update the list
    } catch (error) {
      throw error;
    }
  };

  // Reminder methods (still using localStorage)
  const addReminder = async (reminder: Omit<Reminder, "id" | "createdAt" | "completed">) => {
    try {
      await remindersAPI.createReminder({
        lead_id: reminder.leadId != null ? String(reminder.leadId) : null,
        client_id: reminder.clientId != null ? String(reminder.clientId) : null,
        lead_name: reminder.leadName ?? null,
        client_name: reminder.clientName ?? null,
        contact_email: reminder.contactEmail ?? null,
        contact_phone: reminder.contactPhone ?? null,
        type: reminder.type,
        due_date: reminder.date,
        due_time: reminder.time || null,
        notes: reminder.notes ?? null,
      });
      await refreshRemindersHook();
    } catch (error) {
      throw error;
    }
  };

  const completeReminder = async (id: number) => {
    try {
      await remindersAPI.completeReminder(String(id));
      await refreshRemindersHook();
    } catch (error) {
      throw error;
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      await remindersAPI.deleteReminder(String(id));
      await refreshRemindersHook();
    } catch (error) {
      throw error;
    }
  };

  const value: AppContextType = {
    // Data from Realtime hooks
    projects: realtimeProjects,
    tasks: realtimeTasks,
    teamMembers: realtimeTeam,
    vendors: realtimeVendors,
    clients: realtimeClients,
    leads: realtimeLeads,
    inventory: realtimeInventory,
    transactions: realtimeTransactions,
    
    // Local data
    activities,
    taskTemplates,
    reminders,
    phaseQCReviews,

    // Loading states
    isLoadingProjects,
    isLoadingTasks,
    isLoadingTeam,
    isLoadingVendors,
    isLoadingClients,
    isLoadingLeads,
    isLoadingInventory,
    isLoadingTransactions,

    // Refresh methods
    refreshProjects,
    refreshTasks,
    refreshTeam,
    refreshVendors,
    refreshClients,
    refreshLeads,
    refreshInventory,
    refreshTransactions,
    refreshActivities,
    refreshTaskTemplates,

    // CRUD methods
    addProject,
    updateProject,
    deleteProject,
    getProject,
    addTask,
    updateTask,
    deleteTask,
    getTasksByProject,
    saveTaskTemplate,
    deleteTaskTemplate,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    deleteTeamMemberAndReassign,
    getTeamMember,
    addVendor,
    updateVendor,
    deleteVendor,
    addClient,
    updateClient,
    deleteClient,
    addLead,
    updateLead,
    deleteLead,
    convertLeadToClient,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addReminder,
    completeReminder,
    deleteReminder,
    googleReviewsUrl,
    websiteUrl,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
