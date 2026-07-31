import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import { generateInsights } from "../src/features/insights/api";

interface Insight {
  type: "success" | "warning" | "info";
  text: string;
  icon: "trend" | "alert" | "lightbulb";
}

// AI insights are generated server-side now (see the new /insights/generate
// route on the make-server-bcab437c edge function) using a server-only
// OpenAI key -- not a key pasted into this browser's localStorage, which
// couldn't be role-gated at all. The server decides how much detail to
// include based on the caller's real role before it ever reaches the model.
export default function AIInsightsWidget() {
  const { projects, tasks, teamMembers, leads } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(
    localStorage.getItem("ai_insights_timestamp")
  );

  useEffect(() => {
    const savedInsights = localStorage.getItem("ai_insights_dashboard");
    if (savedInsights) {
      try {
        setInsights(JSON.parse(savedInsights));
      } catch (e) {
        // Silently ignore parse errors
      }
    }
  }, []);

  const parseInsightText = (text: string): Insight[] => {
    const lines = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^[\d\.\-\*\•#\s]+/, "").trim())
      .filter((line) => line.length > 10)
      .slice(0, 6);

    return lines.map((lineText, index) => {
      const lower = lineText.toLowerCase();
      if (lower.includes("bottleneck") || lower.includes("risk") || lower.includes("delay") || lower.includes("overdue")) {
        return { type: "warning" as const, text: lineText, icon: "alert" as const };
      }
      if (index === 0 || lower.includes("recommend") || lower.includes("timeline") || lower.includes("staffing")) {
        return { type: "success" as const, text: lineText, icon: "trend" as const };
      }
      return { type: "info" as const, text: lineText, icon: "lightbulb" as const };
    });
  };

  const generateQuickInsights = async () => {
    setLoading(true);
    try {
      const result = await generateInsights(90);
      const parsedInsights = parseInsightText(result.content);
      setInsights(parsedInsights);
      localStorage.setItem("ai_insights_dashboard", JSON.stringify(parsedInsights));
      const timestamp = result.createdAt || new Date().toISOString();
      localStorage.setItem("ai_insights_timestamp", timestamp);
      setLastGenerated(timestamp);
      toast.success("AI Insights Generated!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("aren't configured yet")) {
        toast.error(errorMessage);
      } else {
        toast.error("AI temporarily unavailable. Showing data-driven insights instead.");
      }

      // Fallback to rule-based insights computed from data already in the
      // browser -- not AI-generated, but still real and not fabricated.
      const fallbackInsights = generateFallbackInsights();
      setInsights(fallbackInsights);
      localStorage.setItem("ai_insights_dashboard", JSON.stringify(fallbackInsights));
      const timestamp = new Date().toISOString();
      localStorage.setItem("ai_insights_timestamp", timestamp);
      setLastGenerated(timestamp);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackInsights = (): Insight[] => {
    const insights: Insight[] = [];

    const completedProjects = projects.filter((p) => p.status === "Completed").length;
    const activeProjects = projects.filter((p) => p.status === "In Progress").length;

    if (activeProjects > 0) {
      insights.push({
        type: "success",
        text: `${activeProjects} active project${
          activeProjects > 1 ? "s are" : " is"
        } in progress with strong momentum.`,
        icon: "trend",
      });
    } else if (completedProjects > 0) {
      insights.push({
        type: "success",
        text: `${completedProjects} project${
          completedProjects > 1 ? "s" : ""
        } completed successfully this period.`,
        icon: "trend",
      });
    } else {
      insights.push({
        type: "info",
        text: "Ready to start new projects - pipeline is clear for incoming work.",
        icon: "lightbulb",
      });
    }

    const overdueTasks = tasks.filter(
      (t) => t.status !== "Completed" && new Date(t.dueDate) < new Date()
    );
    const delayedProjects = projects.filter(
      (p) => p.status === "Delayed" || p.status === "At Risk"
    );

    if (overdueTasks.length > 0) {
      insights.push({
        type: "warning",
        text: `${overdueTasks.length} task${
          overdueTasks.length > 1 ? "s are" : " is"
        } overdue - immediate attention needed.`,
        icon: "alert",
      });
    } else if (delayedProjects.length > 0) {
      insights.push({
        type: "warning",
        text: `${delayedProjects.length} project${
          delayedProjects.length > 1 ? "s need" : " needs"
        } recovery planning to get back on track.`,
        icon: "alert",
      });
    } else {
      insights.push({
        type: "success",
        text: "All tasks and projects are on schedule - excellent team performance!",
        icon: "trend",
      });
    }

    if (teamMembers.length > 0) {
      insights.push({
        type: "info",
        text: `${teamMembers.length} team member${teamMembers.length > 1 ? "s" : ""} across ${projects.length} project${projects.length === 1 ? "" : "s"} -- open Productivity for time and QC trends.`,
        icon: "lightbulb",
      });
    } else if (leads.length > 0) {
      insights.push({
        type: "info",
        text: `${leads.length} active lead${leads.length > 1 ? "s" : ""} in the pipeline.`,
        icon: "lightbulb",
      });
    }

    return insights;
  };

  const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return "";
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIconComponent = (icon: Insight["icon"]) => {
    switch (icon) {
      case "trend":
        return TrendingUp;
      case "alert":
        return AlertCircle;
      case "lightbulb":
        return Lightbulb;
    }
  };

  return (
    <div className="bg-card border border-border rounded-[20px] p-[24px]">
      <div className="flex items-center justify-between mb-[16px]">
        <div>
          <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            AI Insights
          </h3>
          {lastGenerated && (
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[4px]">
              Updated {getRelativeTime(lastGenerated)}
            </p>
          )}
        </div>
        <Button
          onClick={generateQuickInsights}
          disabled={loading}
          size="sm"
          variant="outline"
          className="h-[32px] px-[12px] gap-[6px]"
        >
          {loading ? (
            <Sparkles className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span className="font-['Roboto_Mono'] text-[10px]">
            {loading ? "Analyzing..." : "Refresh"}
          </span>
        </Button>
      </div>

      <div className="space-y-[12px]">
        {insights.length === 0 ? (
          <div className="text-center py-[24px]">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-[8px] opacity-50" />
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
              Click "Refresh" to generate AI-powered insights
            </p>
          </div>
        ) : (
          insights.map((insight, index) => {
            const IconComponent = getIconComponent(insight.icon);
            return (
              <div
                key={index}
                className={`flex items-start gap-[12px] p-[12px] rounded-[12px] border ${
                  insight.type === "success"
                    ? "bg-accent/5 border-accent/20"
                    : insight.type === "warning"
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div
                  className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 ${
                    insight.type === "success"
                      ? "bg-accent/10"
                      : insight.type === "warning"
                      ? "bg-destructive/10"
                      : "bg-primary/10"
                  }`}
                >
                  <IconComponent
                    className={`w-[12px] h-[12px] ${
                      insight.type === "success"
                        ? "text-accent"
                        : insight.type === "warning"
                        ? "text-destructive"
                        : "text-primary"
                    }`}
                  />
                </div>
                <p className="font-['Roboto_Mono'] text-[11px] text-foreground leading-[1.5] flex-1">
                  {insight.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
