import { useState, useEffect } from "react";
import { FolderKanban, CheckSquare, ClipboardCheck } from "lucide-react";
import ProjectManagement from "./ProjectManagement";
import ProjectDetails from "./ProjectDetailsReal";
import TaskManagement from "./TaskManagement";
import QCReviewQueue, { usePendingQCCount } from "./QCReviewQueue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useApp } from "./AppContext";
import { Badge } from "./ui/badge";

interface ProjectsGroupProps {
  initialTab?: "projects" | "tasks" | "qc-review";
  selectedProjectId?: number | null;
  onProjectSelect?: (id: number | null) => void;
  openCreateDialog?: boolean;
  onDialogOpenChange?: () => void;
}

export default function ProjectsGroup({ 
  initialTab = "projects",
  selectedProjectId,
  onProjectSelect,
  openCreateDialog = false,
  onDialogOpenChange
}: ProjectsGroupProps) {
  const [activeTab, setActiveTab] = useState<"projects" | "tasks" | "qc-review">(initialTab);
  const { tasks } = useApp();
  
  // Count phases needing QC review
  const pendingQCCount = usePendingQCCount();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleViewProject = (projectId: number) => {
    onProjectSelect?.(projectId);
  };

  const handleBackToProjects = () => {
    onProjectSelect?.(null);
  };

  // If a project is selected, show project details
  if (selectedProjectId) {
    return (
      <ProjectDetails
        projectId={selectedProjectId}
        onBack={handleBackToProjects}
      />
    );
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "projects" | "tasks" | "qc-review")} className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border rounded-[12px] p-[4px] mb-[24px] h-auto">
          <TabsTrigger 
            value="projects" 
            className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px]"
          >
            <FolderKanban className="w-[14px] h-[14px]" />
            Projects
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px]"
          >
            <CheckSquare className="w-[14px] h-[14px]" />
            Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="qc-review" 
            className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px] relative"
          >
            <ClipboardCheck className="w-[14px] h-[14px]" />
            QC Review
            {pendingQCCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-[4px] h-[18px] min-w-[18px] flex items-center justify-center px-[6px] font-['Roboto_Mono'] text-[10px]"
              >
                {pendingQCCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-0">
          <ProjectManagement 
            onViewProject={handleViewProject}
            openCreateDialog={openCreateDialog}
            onDialogOpenChange={onDialogOpenChange}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0">
          <TaskManagement />
        </TabsContent>

        <TabsContent value="qc-review" className="mt-0">
          <QCReviewQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}