import { useState, useEffect, useCallback } from "react";
import { Search, FolderKanban, CheckSquare, Users, Building2, UserCircle, Package, ArrowRight } from "lucide-react";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

interface SearchResult {
  id: string | number;
  title: string;
  subtitle?: string;
  type: "project" | "task" | "team" | "vendor" | "client" | "inventory";
  icon: React.ElementType;
  data: any;
}

interface GlobalSearchProps {
  onNavigate: (view: string, subViewOrId?: string | number) => void;
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const { hasPermission } = useAuth();
  const {
    projects,
    tasks,
    teamMembers,
    vendors,
    clients,
    inventory,
    getProject,
    getTeamMember,
    getVendor,
    getClient,
  } = useApp();

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      const searchTerm = query.toLowerCase();
      const searchResults: SearchResult[] = [];

      // Search Projects
      if (hasPermission("canViewProjects")) {
        projects
          .filter(
            (project) =>
              project.title?.toLowerCase().includes(searchTerm) ||
              project.client?.toLowerCase().includes(searchTerm) ||
              project.location?.toLowerCase().includes(searchTerm)
          )
          .forEach((project) => {
            searchResults.push({
              id: project.id,
              title: project.title,
              subtitle: `${project.client} • ${project.location}`,
              type: "project",
              icon: FolderKanban,
              data: project,
            });
          });
      }

      // Search Tasks
      if (hasPermission("canViewProjects")) {
        tasks
          .filter(
            (task) =>
              task.title?.toLowerCase().includes(searchTerm) ||
              task.description?.toLowerCase().includes(searchTerm)
          )
          .forEach((task) => {
            const project = getProject(task.projectId);
            searchResults.push({
              id: task.id,
              title: task.title,
              subtitle: project ? `${project.title}` : undefined,
              type: "task",
              icon: CheckSquare,
              data: task,
            });
          });
      }

      // Search Team Members
      if (hasPermission("canViewTeam")) {
        teamMembers
          .filter(
            (member) =>
              member.name?.toLowerCase().includes(searchTerm) ||
              member.role?.toLowerCase().includes(searchTerm) ||
              member.email?.toLowerCase().includes(searchTerm)
          )
          .forEach((member) => {
            searchResults.push({
              id: member.id,
              title: member.name,
              subtitle: `${member.role} • ${member.email}`,
              type: "team",
              icon: Users,
              data: member,
            });
          });
      }

      // Search Vendors
      if (hasPermission("canViewVendors")) {
        vendors
          .filter(
            (vendor) =>
              vendor.name?.toLowerCase().includes(searchTerm) ||
              vendor.category?.toLowerCase().includes(searchTerm) ||
              vendor.contact?.email?.toLowerCase().includes(searchTerm) ||
              vendor.contact?.phone?.toLowerCase().includes(searchTerm)
          )
          .forEach((vendor) => {
            searchResults.push({
              id: vendor.id,
              title: vendor.name,
              subtitle: `${vendor.category} • ${vendor.contact?.email || vendor.contact?.phone || 'No contact'}`,
              type: "vendor",
              icon: Building2,
              data: vendor,
            });
          });
      }

      // Search Clients (CRM)
      if (hasPermission("canViewCRM")) {
        clients
          .filter(
            (client) =>
              client.name?.toLowerCase().includes(searchTerm) ||
              client.email?.toLowerCase().includes(searchTerm) ||
              client.phone?.toLowerCase().includes(searchTerm)
          )
          .forEach((client) => {
            searchResults.push({
              id: client.id,
              title: client.name,
              subtitle: `${client.email} • ${client.phone}`,
              type: "client",
              icon: UserCircle,
              data: client,
            });
          });
      }

      // Search Inventory
      if (hasPermission("canViewInventory")) {
        inventory
          .filter(
            (item) =>
              item.name?.toLowerCase().includes(searchTerm) ||
              item.category?.toLowerCase().includes(searchTerm) ||
              item.sku?.toLowerCase().includes(searchTerm)
          )
          .forEach((item) => {
            searchResults.push({
              id: item.id,
              title: item.name,
              subtitle: `${item.category} • SKU: ${item.sku}`,
              type: "inventory",
              icon: Package,
              data: item,
            });
          });
      }

      setResults(searchResults.slice(0, 50)); // Limit to 50 results
    },
    [
      projects,
      tasks,
      teamMembers,
      vendors,
      clients,
      inventory,
      hasPermission,
      getProject,
    ]
  );

  // Update results when search query changes
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearchQuery("");

    // Navigate based on result type
    switch (result.type) {
      case "project":
        onNavigate("project-details", result.id as number);
        break;
      case "task":
        // Navigate to tasks view - could be enhanced to highlight specific task
        onNavigate("tasks");
        break;
      case "team":
        onNavigate("team");
        break;
      case "vendor":
        onNavigate("vendors");
        break;
      case "client":
        onNavigate("crm");
        break;
      case "inventory":
        onNavigate("inventory");
        break;
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels = {
    project: "Projects",
    task: "Tasks",
    team: "Team Members",
    vendor: "Vendors",
    client: "Clients",
    inventory: "Inventory",
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[8px] px-[8px] py-[6px] md:px-[12px] bg-card rounded-[8px] border border-border hover:bg-accent/5 transition-colors md:min-w-[280px]"
        aria-label="Search"
      >
        <Search className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
        <span className="hidden md:block flex-1 text-left font-['Roboto_Mono'] text-[11px] text-muted-foreground">
          Search...
        </span>
        <kbd className="hidden md:inline-flex pointer-events-none select-none items-center gap-[2px] rounded-[4px] border border-border bg-muted px-[6px] h-[18px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <CommandDialog 
        open={open} 
        onOpenChange={setOpen}
        title="Global Search"
        description="Search across projects, tasks, team, vendors, and more"
      >
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-[12px] [&_[cmdk-group-heading]]:py-[8px] [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-['Roboto_Mono'] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
          <div className="flex items-center border-b border-border px-[16px]">
            <Search className="mr-[8px] h-[14px] w-[14px] shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects, tasks, team, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-[48px] w-full bg-transparent py-[12px] text-[13px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 font-['Roboto_Mono'] border-0"
            />
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto p-[8px]">
            <CommandEmpty className="py-[32px] text-center text-[12px] font-['Roboto_Mono'] text-muted-foreground">
              No results found.
            </CommandEmpty>
            {Object.entries(groupedResults).map(([type, items]) => (
              <CommandGroup
                key={type}
                heading={typeLabels[type as keyof typeof typeLabels]}
              >
                {items.map((result) => {
                  const Icon = result.icon;
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-[12px] px-[12px] py-[10px] rounded-[8px] cursor-pointer data-[selected=true]:bg-accent/10 mb-[4px]"
                    >
                      <div className="flex items-center justify-center w-[32px] h-[32px] rounded-[6px] bg-accent/10 shrink-0">
                        <Icon className="w-[14px] h-[14px] text-accent" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-['Roboto_Mono'] text-[12px] text-foreground truncate">
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-[12px] h-[12px] text-muted-foreground shrink-0" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
