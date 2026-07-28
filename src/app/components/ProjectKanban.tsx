import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { useApp, Project } from "./AppContext";
import { useState, useEffect } from "react";

// Default phases for Cstle Livn
const DEFAULT_PHASES = [
  "Planning",
  "Prepping",
  "Production",
  "Finishing",
  "Final Inspection",
  "Delivered/Completed",
];

// Get phases from localStorage or use defaults
function getProjectPhases(): string[] {
  const saved = localStorage.getItem("project_phases");
  return saved ? JSON.parse(saved) : DEFAULT_PHASES;
}

interface ProjectKanbanProps {
  projects: Project[];
}

const PHASES = getProjectPhases();

interface DraggableProjectCardProps {
  project: Project;
}

function DraggableProjectCard({ project }: DraggableProjectCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "project",
    item: { id: project.id, currentPhase: project.phase },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card className="p-4 cursor-move hover:shadow-md transition-shadow">
        <h4 className="mb-2">{project.title}</h4>
        <p className="text-muted-foreground mb-3">{project.client}</p>
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
        <Badge variant="outline">${project.budget.toLocaleString()}</Badge>
      </Card>
    </div>
  );
}

interface PhaseColumnProps {
  phase: string;
  projects: Project[];
  onDrop: (projectId: number, newPhase: string) => void;
}

function PhaseColumn({ phase, projects, onDrop }: PhaseColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "project",
    drop: (item: { id: number; currentPhase: string }) => {
      if (item.currentPhase !== phase) {
        onDrop(item.id, phase);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 rounded-lg border-2 ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-card"
      } p-4 transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3>{phase}</h3>
        <Badge variant="secondary">{projects.length}</Badge>
      </div>
      <div className="space-y-3">
        {projects.map((project) => (
          <DraggableProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <p>Drop projects here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectKanban({ projects: initialProjects }: ProjectKanbanProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [phases, setPhases] = useState<string[]>(getProjectPhases());

  // Listen for phase changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setPhases(getProjectPhases());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // ✅ POLLING REMOVED - Phase updates now sync via Realtime WebSocket
    // Previously: Checked for phase changes every 1 second
    // Now: Real-time updates via useProjects hook and project data changes

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [phases]);

  const handleDrop = (projectId: number, newPhase: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, phase: newPhase } : p
      )
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Drag and drop projects between phases to update their status
          </p>
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {phases.map((phase) => (
              <PhaseColumn
                key={phase}
                phase={phase}
                projects={projects.filter((p) => p.phase === phase)}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}