import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";

interface Project {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
  phase: string;
}

interface ProjectGanttChartProps {
  projects: Project[];
}

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

export default function ProjectGanttChart({ projects }: ProjectGanttChartProps) {
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

  // Generate timeline months
  const getMonthsBetween = (start: string, end: string) => {
    const months = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      months.push({
        label: current.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        date: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  // Get all unique months from all projects
  const allDates = projects.flatMap((p) => [p.startDate, p.endDate]);
  const minDate = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
  const timelineMonths = getMonthsBetween(
    minDate.toISOString().split("T")[0],
    maxDate.toISOString().split("T")[0]
  );

  const getProjectPosition = (project: Project) => {
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const timelineStart = timelineMonths[0].date;
    const timelineEnd = new Date(
      timelineMonths[timelineMonths.length - 1].date.getFullYear(),
      timelineMonths[timelineMonths.length - 1].date.getMonth() + 1,
      0
    );

    const totalDays =
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset =
      (projectStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const duration =
      (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  return (
    <Card className="p-6">
      <h3 className="mb-6">Project Timeline - Gantt Chart</h3>

      <div className="space-y-6">
        {/* Timeline Header */}
        <div className="flex gap-4">
          <div className="w-64 flex-shrink-0" />
          <div className="flex-1 flex">
            {timelineMonths.map((month, index) => (
              <div
                key={index}
                className="flex-1 text-center border-l border-border first:border-l-0"
              >
                <p className="text-muted-foreground">{month.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        {projects.map((project) => {
          const position = getProjectPosition(project);
          return (
            <div key={project.id} className="flex gap-4 items-center">
              <div className="w-64 flex-shrink-0">
                <h4>{project.name}</h4>
              </div>
              <div className="flex-1 relative h-16 border-l border-border">
                {timelineMonths.map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full border-l border-border"
                    style={{
                      left: `${((index + 1) / timelineMonths.length) * 100}%`,
                    }}
                  />
                ))}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-10 rounded-lg flex items-center px-3 text-white shadow-sm"
                  style={{
                    left: position.left,
                    width: position.width,
                    backgroundColor:
                      project.color === "bg-primary"
                        ? "var(--primary)"
                        : project.color === "bg-accent"
                        ? "var(--accent)"
                        : "var(--destructive)",
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{project.phase}</span>
                    <span>{project.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Phase Legend */}
        <div className="pt-6 border-t border-border">
          <p className="text-muted-foreground mb-3">Common Project Phases:</p>
          <div className="flex flex-wrap gap-3">
            {phases.map((phase, index) => (
              <div
                key={index}
                className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
              >
                {phase}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}