import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useApp } from "./AppContext";

interface Insight {
  type: "success" | "warning" | "info";
  text: string;
  icon: "trend" | "alert" | "lightbulb";
}

export default function AIInsightsWidget() {
  const { projects, tasks, teamMembers, clients, leads } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(
    localStorage.getItem("ai_insights_timestamp")
  );

  // Auto-load insights on mount if they were generated recently
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

  const generateQuickInsights = async () => {
    const openAIKey = localStorage.getItem("openai_api_key");

    if (!openAIKey) {
      toast.error("Please add your OpenAI API key in Settings → API Keys");
      return;
    }

    setLoading(true);

    try {
      // Prepare detailed, specific analytics data with names and numbers
      const analyticsData = {
        projects: {
          total: projects.length,
          active: projects.filter((p) => p.status === "In Progress").length,
          delayed: projects.filter(
            (p) => p.status === "Delayed" || p.status === "At Risk"
          ).length,
          completed: projects.filter((p) => p.status === "Completed").length,
          totalBudget: projects.reduce(
            (sum, p) => sum + (parseFloat(p.budget) || 0),
            0
          ),
          totalSpent: projects.reduce(
            (sum, p) => sum + (parseFloat(p.spent) || 0),
            0
          ),
          avgProgress:
            projects.length > 0
              ? projects.reduce((sum, p) => sum + (p.progress || 0), 0) /
                projects.length
              : 0,
          // Specific project details
          delayedProjects: projects
            .filter((p) => p.status === "Delayed" || p.status === "At Risk")
            .map(p => ({
              name: p.name,
              budget: p.budget,
              spent: p.spent,
              progress: p.progress,
              daysOverdue: p.endDate ? Math.floor((new Date().getTime() - new Date(p.endDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
            })),
          overBudgetProjects: projects
            .filter((p) => parseFloat(p.spent || '0') > parseFloat(p.budget || '0') * 0.9)
            .map(p => ({
              name: p.name,
              budget: parseFloat(p.budget || '0'),
              spent: parseFloat(p.spent || '0'),
              overBy: parseFloat(p.spent || '0') - parseFloat(p.budget || '0'),
              percentOver: ((parseFloat(p.spent || '0') / parseFloat(p.budget || '0') - 1) * 100).toFixed(1)
            })),
          topProjects: projects
            .sort((a, b) => (parseFloat(b.budget) || 0) - (parseFloat(a.budget) || 0))
            .slice(0, 3)
            .map(p => ({
              name: p.name,
              budget: parseFloat(p.budget || '0'),
              client: p.clientName,
              status: p.status
            }))
        },
        tasks: {
          total: tasks.length,
          overdue: tasks.filter(
            (t) =>
              t.status !== "Completed" && new Date(t.dueDate) < new Date()
          ).length,
          completed: tasks.filter((t) => t.status === "Completed").length,
          // Specific overdue tasks
          overdueTasksByProject: tasks
            .filter((t) => t.status !== "Completed" && new Date(t.dueDate) < new Date())
            .reduce((acc, task) => {
              const projectName = task.projectName || "Unknown Project";
              if (!acc[projectName]) acc[projectName] = 0;
              acc[projectName]++;
              return acc;
            }, {} as Record<string, number>)
        },
        team: {
          total: teamMembers.length,
          active: teamMembers.filter((m) => m.active !== false).length,
          avgAura:
            teamMembers.length > 0
              ? (
                  teamMembers.reduce(
                    (sum, m) => sum + (parseFloat(m.auraRating) || 0),
                    0
                  ) / teamMembers.length
                ).toFixed(2)
              : "0",
          // Specific team member insights
          topPerformers: teamMembers
            .filter(m => m.auraRating && parseFloat(m.auraRating) >= 4.5)
            .sort((a, b) => parseFloat(b.auraRating) - parseFloat(a.auraRating))
            .slice(0, 3)
            .map(m => ({
              name: m.name,
              rating: m.auraRating,
              role: m.role
            })),
          lowPerformers: teamMembers
            .filter(m => m.auraRating && parseFloat(m.auraRating) < 3.5)
            .map(m => ({
              name: m.name,
              rating: m.auraRating,
              role: m.role
            })),
          roleDistribution: teamMembers.reduce((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        crm: {
          leads: leads.length,
          clients: clients.length,
          conversionRate:
            leads.length + clients.length > 0
              ? (
                  (clients.length / (leads.length + clients.length)) *
                  100
                ).toFixed(1)
              : "0",
          // Specific lead pipeline details
          leadsByStatus: leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          staleLead: leads
            .filter(l => {
              const lastContact = new Date(l.lastContactDate || l.createdAt);
              const daysSince = (new Date().getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 14;
            })
            .length,
          totalPipelineValue: leads.reduce((sum, l) => sum + (parseFloat(l.estimatedValue) || 0), 0)
        },
        financial: {
          totalRevenue: projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0),
          totalSpent: projects.reduce((sum, p) => sum + (parseFloat(p.spent) || 0), 0),
          estimatedProfit: projects.reduce((sum, p) => {
            const budget = parseFloat(p.budget) || 0;
            const spent = parseFloat(p.spent) || 0;
            return sum + (budget - spent);
          }, 0),
          avgMargin: projects.length > 0 
            ? ((1 - projects.reduce((sum, p) => sum + (parseFloat(p.spent) || 0), 0) / 
                projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0)) * 100).toFixed(1)
            : 0
        }
      };

      // Call OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                `You are a business optimization consultant for Cstle Livn, a finishing installer company (trims, doors, painting, flooring, handrailings, basement builds, ADUs).

YOUR MISSION: Provide 3 ULTRA-SPECIFIC, DATA-DRIVEN insights with EXACT numbers, names, and dollar amounts.

RULES - YOU MUST FOLLOW THESE:
1. ✅ USE SPECIFIC PROJECT NAMES from the data (e.g., "Oak Street Renovation is $12,500 over budget")
2. ✅ USE EXACT DOLLAR AMOUNTS (e.g., "$45,000 profit opportunity", "save $8,300 monthly")
3. ✅ USE SPECIFIC TEAM MEMBER NAMES and ratings (e.g., "Sarah Chen (4.8 Aura) is outperforming")
4. ✅ USE SPECIFIC PERCENTAGES from the actual data provided
5. ✅ REFERENCE SPECIFIC NUMBERS (e.g., "3 projects", "15 overdue tasks", "$127K pipeline")
6. ❌ NEVER use vague terms like "some projects", "several team members", "consider improving"
7. ❌ NEVER give generic advice - every insight must be tied to SPECIFIC data points

FOCUS AREAS (pick 3):
- COST REDUCTION: Name specific projects/vendors wasting money with exact dollar amounts
- REVENUE GROWTH: Identify specific opportunities with exact revenue potential
- TEAM OPTIMIZATION: Name specific people to promote/coach/reallocate with their ratings

FORMAT: Each insight = 1-2 sentences with SPECIFIC names and numbers, followed by ONE clear action.

EXAMPLE GOOD INSIGHT: "Riverside Apartment project is $18,200 over budget (121% spent). Immediately review material costs with vendor ABC Supply and implement weekly budget checkpoints."

EXAMPLE BAD INSIGHT: "Some projects are experiencing budget overruns. Consider implementing better tracking." ❌`,
            },
            {
              role: "user",
              content: `Generate 3 hyper-specific insights using THIS EXACT DATA:\n\n${JSON.stringify(
                analyticsData,
                null,
                2
              )}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 350,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Using fallback insights instead.");
        } else if (response.status === 401) {
          throw new Error("Invalid API key. Please check your key in Settings.");
        } else if (response.status === 404) {
          throw new Error("Model not found. Please check your OpenAI account access.");
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "";

      // Parse AI response into insights
      const insightLines = aiResponse
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^[\d\.\-\*\•]\s*/, "").trim())
        .filter((line) => line.length > 10)
        .slice(0, 3);

      const parsedInsights: Insight[] = insightLines.map((text, index) => {
        // Categorize insights
        if (
          index === 0 ||
          text.toLowerCase().includes("strong") ||
          text.toLowerCase().includes("excellent") ||
          text.toLowerCase().includes("performing well")
        ) {
          return { type: "success" as const, text, icon: "trend" as const };
        } else if (
          index === 1 ||
          text.toLowerCase().includes("delayed") ||
          text.toLowerCase().includes("overdue") ||
          text.toLowerCase().includes("risk")
        ) {
          return { type: "warning" as const, text, icon: "alert" as const };
        } else {
          return { type: "info" as const, text, icon: "lightbulb" as const };
        }
      });

      setInsights(parsedInsights);
      localStorage.setItem("ai_insights_dashboard", JSON.stringify(parsedInsights));
      const timestamp = new Date().toISOString();
      localStorage.setItem("ai_insights_timestamp", timestamp);
      setLastGenerated(timestamp);
      toast.success("AI Insights Generated!");
    } catch (error) {
      // More specific error messages
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Rate limit")) {
        toast.error("OpenAI rate limit reached. Showing smart fallback insights.");
      } else if (errorMessage.includes("Invalid API key")) {
        toast.error("Invalid API key. Please update in Settings → API Keys");
      } else {
        toast.error("AI temporarily unavailable. Showing data-driven insights.");
      }

      // Fallback to rule-based insights
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

    // Positive insight
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

    // Warning insight
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

    // Strategic suggestion
    if (leads.length > clients.length * 2) {
      insights.push({
        type: "info",
        text: `${leads.length} active leads - consider adding sales resources to convert opportunities.`,
        icon: "lightbulb",
      });
    } else if (teamMembers.length > 0) {
      const avgAura =
        teamMembers.reduce(
          (sum, m) => sum + (parseFloat(m.auraRating) || 0),
          0
        ) / teamMembers.length;
      if (avgAura >= 4.0) {
        insights.push({
          type: "info",
          text: `Team Aura average is ${avgAura.toFixed(
            1
          )} - consider rewarding high performers.`,
          icon: "lightbulb",
        });
      } else {
        insights.push({
          type: "info",
          text: "Focus on team development and training to improve performance metrics.",
          icon: "lightbulb",
        });
      }
    } else {
      insights.push({
        type: "info",
        text: "Build your team and start tracking performance with the Aura system.",
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