import { useState } from "react";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useApp } from "./AppContext";

export default function AnalyticsModule() {
  // ✅ WEBSOCKET-ONLY: Use real-time data from AppContext (no API calls)
  const { projects, tasks, teamMembers, vendors, clients, leads } = useApp();
  
  const [timeRange, setTimeRange] = useState("year");
  const [aiInsights, setAiInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Calculate phase distribution from real project data
  const phaseData = (() => {
    const phaseCounts = {};
    projects.forEach((project) => {
      const phase = project.currentPhase || project.status || "Planning";
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    });

    return Object.entries(phaseCounts).map(([name, value]) => ({
      name,
      value,
    }));
  })();

  // Calculate revenue data from projects (grouped by month)
  const revenueData = (() => {
    const monthlyData = {};
    const now = new Date();
    
    // Generate last 7 months
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0, profit: 0 };
    }

    projects.forEach((project) => {
      if (project.budget && project.startDate) {
        const projectDate = new Date(project.startDate);
        const monthKey = projectDate.toLocaleString('default', { month: 'short' });
        
        if (monthlyData[monthKey]) {
          const revenue = parseFloat(project.budget) || 0;
          const expenses = revenue * 0.72; // Estimate 72% expenses
          monthlyData[monthKey].revenue += revenue;
          monthlyData[monthKey].expenses += expenses;
          monthlyData[monthKey].profit = monthlyData[monthKey].revenue - monthlyData[monthKey].expenses;
        }
      }
    });

    return Object.values(monthlyData);
  })();

  // Calculate project completion data
  const completionData = (() => {
    const monthlyData = {};
    const now = new Date();
    
    // Generate last 7 months
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyData[monthKey] = { month: monthKey, completed: 0, onTrack: 0, delayed: 0 };
    }

    projects.forEach((project) => {
      if (project.startDate) {
        const projectDate = new Date(project.startDate);
        const monthKey = projectDate.toLocaleString('default', { month: 'short' });
        
        if (monthlyData[monthKey]) {
          if (project.status === "Completed") {
            monthlyData[monthKey].completed += 1;
          } else if (project.status === "Delayed" || project.status === "At Risk") {
            monthlyData[monthKey].delayed += 1;
          } else {
            monthlyData[monthKey].onTrack += 1;
          }
        }
      }
    });

    return Object.values(monthlyData);
  })();

  // Calculate client conversion funnel from real CRM data
  const conversionData = [
    { stage: "Leads", count: leads.length },
    { stage: "Contacted", count: leads.filter(l => l.status === "Contacted" || l.status === "Qualified").length },
    { stage: "Proposal", count: leads.filter(l => l.status === "Proposal Sent").length },
    { stage: "Won", count: clients.length },
  ];

  // Calculate vendor performance from real data
  const vendorPerformance = vendors
    .map((vendor) => {
      // Count projects for this vendor
      const vendorProjects = projects.filter(p => 
        p.vendors?.includes(vendor.name) || p.vendor === vendor.name
      ).length;
      
      return {
        name: vendor.name,
        rating: vendor.rating || 0,
        projects: vendorProjects, // Only use real project count
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5); // Top 5 vendors

  const COLORS = [
    "var(--primary)",
    "var(--accent)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--primary)",
  ];

  // Calculate real stats from data
  const avgRevenuePerProject = projects.length > 0 
    ? (projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0) / projects.length).toFixed(1) + "K"
    : "$0";

  const completionRate = projects.length > 0
    ? Math.round((projects.filter(p => p.status === "Completed").length / projects.length) * 100) + "%"
    : "0%";

  const conversionRate = leads.length > 0
    ? ((clients.length / (leads.length + clients.length)) * 100).toFixed(1) + "%"
    : "0%";

  const activeTeamCount = teamMembers.filter(m => m.active !== false).length;

  const stats = [
    {
      label: "Avg Revenue/Project",
      value: `$${avgRevenuePerProject}`,
      change: projects.length > 0 ? "" : "—", // No change shown without historical data
      icon: DollarSign,
      color: "text-primary",
    },
    {
      label: "Project Completion Rate",
      value: completionRate,
      change: projects.length > 0 ? "" : "—", // No change shown without historical data
      icon: CheckCircle2,
      color: "text-accent",
    },
    {
      label: "Client Conversion",
      value: conversionRate,
      change: leads.length + clients.length > 0 ? "" : "—", // No change shown without data
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Active Team Members",
      value: String(activeTeamCount),
      change: teamMembers.length > 0 ? "" : "—", // No change shown without data
      icon: Users,
      color: "text-accent",
    },
  ];

  // Generate AI-Powered Insights using OpenAI API
  const handleGenerateInsights = async () => {
    const openAIKey = localStorage.getItem("openai_api_key");
    
    if (!openAIKey) {
      toast.error("Please add your OpenAI API key in Settings → API Keys");
      return;
    }

    setLoadingInsights(true);

    try {
      // Prepare comprehensive analytics data summary for OpenAI
      const analyticsData = {
        overview: {
          totalProjects: projects.length,
          totalRevenue: projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0),
          avgProjectValue: projects.length > 0 
            ? projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0) / projects.length
            : 0,
          teamSize: teamMembers.length,
          clientBase: clients.length,
          leadPipeline: leads.length,
        },
        projects: {
          total: projects.length,
          completed: projects.filter(p => p.status === "Completed").length,
          inProgress: projects.filter(p => p.status === "In Progress").length,
          delayed: projects.filter(p => p.status === "Delayed" || p.status === "At Risk").length,
          avgBudget: projects.length > 0 
            ? projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0) / projects.length
            : 0,
          totalBudget: projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0),
          totalSpent: projects.reduce((sum, p) => sum + (parseFloat(p.spent) || 0), 0),
          completionRate: projects.length > 0 
            ? (projects.filter(p => p.status === "Completed").length / projects.length) * 100
            : 0,
          phases: phaseData,
          // SPECIFIC project details with names and numbers
          delayedProjectsList: projects
            .filter(p => p.status === "Delayed" || p.status === "At Risk")
            .map(p => ({
              name: p.name,
              client: p.clientName,
              budget: parseFloat(p.budget || '0'),
              spent: parseFloat(p.spent || '0'),
              progress: p.progress,
              daysOverdue: p.endDate ? Math.floor((new Date().getTime() - new Date(p.endDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
              status: p.status
            })),
          overBudgetProjects: projects
            .filter(p => parseFloat(p.spent || '0') > parseFloat(p.budget || '0'))
            .map(p => ({
              name: p.name,
              client: p.clientName,
              budget: parseFloat(p.budget || '0'),
              spent: parseFloat(p.spent || '0'),
              overBy: parseFloat(p.spent || '0') - parseFloat(p.budget || '0'),
              percentOver: ((parseFloat(p.spent || '0') / parseFloat(p.budget || '0') - 1) * 100).toFixed(1)
            })),
          nearBudgetProjects: projects
            .filter(p => {
              const spent = parseFloat(p.spent || '0');
              const budget = parseFloat(p.budget || '0');
              return budget > 0 && spent > budget * 0.85 && spent <= budget;
            })
            .map(p => ({
              name: p.name,
              budget: parseFloat(p.budget || '0'),
              spent: parseFloat(p.spent || '0'),
              remaining: parseFloat(p.budget || '0') - parseFloat(p.spent || '0'),
              percentUsed: ((parseFloat(p.spent || '0') / parseFloat(p.budget || '0')) * 100).toFixed(1)
            })),
          topProjects: projects
            .sort((a, b) => (parseFloat(b.budget) || 0) - (parseFloat(a.budget) || 0))
            .slice(0, 5)
            .map(p => ({ 
              name: p.name, 
              budget: parseFloat(p.budget || '0'),
              spent: parseFloat(p.spent || '0'),
              client: p.clientName,
              status: p.status,
              progress: p.progress,
              margin: parseFloat(p.budget || '0') > 0 
                ? ((1 - parseFloat(p.spent || '0') / parseFloat(p.budget || '0')) * 100).toFixed(1)
                : 0
            })),
        },
        tasks: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === "Completed").length,
          inProgress: tasks.filter(t => t.status === "In Progress").length,
          overdue: tasks.filter(t => t.status !== "Completed" && new Date(t.dueDate) < new Date()).length,
          completionRate: tasks.length > 0 
            ? (tasks.filter(t => t.status === "Completed").length / tasks.length) * 100
            : 0,
          // Specific overdue tasks grouped by project
          overdueTasksByProject: tasks
            .filter(t => t.status !== "Completed" && new Date(t.dueDate) < new Date())
            .reduce((acc, task) => {
              const projectName = task.projectName || "Unknown Project";
              if (!acc[projectName]) {
                acc[projectName] = { count: 0, tasks: [] };
              }
              acc[projectName].count++;
              acc[projectName].tasks.push({
                title: task.title,
                daysOverdue: Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))
              });
              return acc;
            }, {} as Record<string, { count: number, tasks: Array<{ title: string, daysOverdue: number }> }>)
        },
        team: {
          total: teamMembers.length,
          active: activeTeamCount,
          avgAuraRating: teamMembers.length > 0
            ? teamMembers.reduce((sum, m) => sum + (parseFloat(m.auraRating) || 0), 0) / teamMembers.length
            : 0,
          highPerformers: teamMembers.filter(m => m.auraRating && parseFloat(m.auraRating) >= 4.5).length,
          midPerformers: teamMembers.filter(m => m.auraRating && parseFloat(m.auraRating) >= 3.5 && parseFloat(m.auraRating) < 4.5).length,
          lowPerformers: teamMembers.filter(m => m.auraRating && parseFloat(m.auraRating) < 3.5).length,
          // SPECIFIC team member names and ratings
          topPerformers: teamMembers
            .sort((a, b) => (parseFloat(b.auraRating) || 0) - (parseFloat(a.auraRating) || 0))
            .slice(0, 5)
            .map(m => ({ name: m.name, rating: m.auraRating, role: m.role, email: m.email })),
          lowPerformersList: teamMembers
            .filter(m => m.auraRating && parseFloat(m.auraRating) < 3.5)
            .map(m => ({ name: m.name, rating: m.auraRating, role: m.role })),
          roleDistribution: teamMembers.reduce((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        crm: {
          leads: leads.length,
          clients: clients.length,
          conversionRate: leads.length + clients.length > 0 
            ? (clients.length / (leads.length + clients.length)) * 100
            : 0,
          leadsByStatus: {
            new: leads.filter(l => l.status === "New").length,
            contacted: leads.filter(l => l.status === "Contacted").length,
            qualified: leads.filter(l => l.status === "Qualified").length,
            proposal: leads.filter(l => l.status === "Proposal Sent").length,
          },
          // SPECIFIC lead pipeline details
          totalPipelineValue: leads.reduce((sum, l) => sum + (parseFloat(l.estimatedValue) || 0), 0),
          avgLeadValue: leads.length > 0 
            ? leads.reduce((sum, l) => sum + (parseFloat(l.estimatedValue) || 0), 0) / leads.length
            : 0,
          staleLeads: leads
            .filter(l => {
              const lastContact = new Date(l.lastContactDate || l.createdAt);
              const daysSince = (new Date().getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 14;
            })
            .map(l => ({
              name: l.companyName || l.contactName,
              value: parseFloat(l.estimatedValue || '0'),
              daysSinceContact: Math.floor((new Date().getTime() - new Date(l.lastContactDate || l.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
              status: l.status
            })),
          topLeads: leads
            .sort((a, b) => (parseFloat(b.estimatedValue) || 0) - (parseFloat(a.estimatedValue) || 0))
            .slice(0, 5)
            .map(l => ({
              name: l.companyName || l.contactName,
              value: parseFloat(l.estimatedValue || '0'),
              status: l.status
            }))
        },
        vendors: {
          total: vendors.length,
          avgRating: vendors.length > 0
            ? vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length
            : 0,
          topRated: vendors.filter(v => v.rating && v.rating >= 4.7).length,
          midRated: vendors.filter(v => v.rating && v.rating >= 4.0 && v.rating < 4.7).length,
          lowRated: vendors.filter(v => v.rating && v.rating < 4.0).length,
          // SPECIFIC vendor names and ratings
          topVendors: vendors
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5)
            .map(v => ({ name: v.name, rating: v.rating, category: v.category })),
          lowRatedVendors: vendors
            .filter(v => v.rating && v.rating < 4.0)
            .map(v => ({ name: v.name, rating: v.rating, category: v.category })),
        },
        financial: {
          avgRevenuePerProject: projects.length > 0 
            ? projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0) / projects.length
            : 0,
          totalRevenue: projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0),
          totalSpent: projects.reduce((sum, p) => sum + (parseFloat(p.spent) || 0), 0),
          estimatedProfit: projects.reduce((sum, p) => {
            const budget = parseFloat(p.budget) || 0;
            const spent = parseFloat(p.spent) || 0;
            return sum + (budget - spent);
          }, 0),
          avgMargin: projects.length > 0 && projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0) > 0
            ? ((1 - projects.reduce((sum, p) => sum + (parseFloat(p.spent) || 0), 0) / 
                projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0)) * 100).toFixed(1)
            : 0,
          totalBudgetedRemaining: projects.reduce((sum, p) => {
            const budget = parseFloat(p.budget) || 0;
            const spent = parseFloat(p.spent) || 0;
            return sum + Math.max(0, budget - spent);
          }, 0)
        },
      };

      // Call OpenAI API with comprehensive prompt
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert profit optimization and cost reduction consultant for Cstle Livn, a modern finishing installer company specializing in trims, doors, painting, flooring, and handrailings, with plans to scale into basement builds and ADUs.

Your PRIMARY MISSION is to analyze the data and provide 8-10 detailed, actionable insights focused specifically on:

1. **💰 COST REDUCTION** - Identify wasteful spending, vendor inefficiencies, resource waste, budget overruns, and specific ways to cut expenses
2. **📈 REVENUE GROWTH** - Spot opportunities to increase project values, improve pricing, upsell services, expand offerings, or capture more market share
3. **💎 PROFIT MAXIMIZATION** - Find ways to improve margins, optimize pricing strategies, reduce overhead, and increase net profit per project
4. **👥 TEAM STRENGTHENING** - Recommend specific actions to boost productivity, improve efficiency, optimize resource allocation, retain top performers, and improve team morale
5. **⚠️ FINANCIAL RISKS** - Flag budget overruns, delayed projects draining resources, underperforming team members, or vendor issues impacting profitability
6. **🎯 QUICK WINS** - Identify immediate actions that can be taken THIS WEEK to save money, increase revenue, or boost team performance

Each insight must:
- Be 2-3 sentences with SPECIFIC DATA POINTS from the provided data
- Include a CLEAR, ACTIONABLE next step the company can implement immediately
- Focus on measurable financial impact (save $X, increase revenue by Y%, improve margin by Z%)
- Prioritize practical, implementable recommendations over generic advice

Format: Start each insight with the category in brackets like "[Cost Reduction]", "[Revenue Growth]", "[Profit Optimization]", "[Team Performance]", "[Financial Risk]", or "[Quick Win]" then provide the specific, data-driven insight with clear action steps.`
            },
            {
              role: "user",
              content: `Analyze this comprehensive business data and provide detailed insights:\n\n${JSON.stringify(analyticsData, null, 2)}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
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

      // Parse AI response into categorized insights
      const insightLines = aiResponse
        .split("\n")
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[\d\.\-\*\•]\s*/, "").trim())
        .filter(line => line.length > 20);

      const parsedInsights = insightLines.map((text) => {
        // Detect category from text
        const categoryMatch = text.match(/^\[([^\]]+)\]/);
        const category = categoryMatch ? categoryMatch[1] : "General";
        const cleanText = text.replace(/^\[([^\]]+)\]\s*/, "");

        // Determine type based on keywords
        let type: "primary" | "accent" = "primary";
        if (
          cleanText.toLowerCase().includes("risk") ||
          cleanText.toLowerCase().includes("concern") ||
          cleanText.toLowerCase().includes("delayed") ||
          cleanText.toLowerCase().includes("overdue") ||
          cleanText.toLowerCase().includes("low")
        ) {
          type = "accent";
        }

        return {
          type,
          text: cleanText,
          category,
        };
      });

      setAiInsights(parsedInsights);
      toast.success(`${parsedInsights.length} AI Insights Generated by OpenAI GPT-4!`);
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
      
      // Fallback to enhanced rule-based insights
      const fallbackInsights = generateFallbackInsights();
      setAiInsights(fallbackInsights);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fallback rule-based insights if OpenAI fails
  const generateFallbackInsights = () => {
    const insights = [];

    // 1. Revenue insights
    if (projects.length > 0) {
      const totalRevenue = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
      const avgRevenue = totalRevenue / projects.length;
      
      if (avgRevenue > 100000) {
        insights.push({
          type: "primary",
          text: `Average project value is $${(avgRevenue / 1000).toFixed(0)}K. Revenue is trending strong - consider expanding team capacity to handle increased demand.`
        });
      } else if (avgRevenue > 0) {
        insights.push({
          type: "accent",
          text: `Average project value is $${(avgRevenue / 1000).toFixed(0)}K. Focus on upselling additional services to increase project values.`
        });
      }
    }

    // 2. Delayed projects insight
    const delayedProjects = projects.filter(p => 
      p.status === "Delayed" || p.status === "At Risk" || p.progress < 50
    );
    
    if (delayedProjects.length > 0) {
      const worstProject = delayedProjects.sort((a, b) => (a.progress || 0) - (b.progress || 0))[0];
      insights.push({
        type: "accent",
        text: `${delayedProjects.length} project${delayedProjects.length > 1 ? 's are' : ' is'} experiencing delays${worstProject ? ` - "${worstProject.name}" needs immediate attention` : ''}. Review resource allocation.`
      });
    } else if (projects.length > 0) {
      insights.push({
        type: "primary",
        text: `All ${projects.length} active projects are on track. Excellent project management performance!`
      });
    }

    // 3. Vendor performance insight
    const topVendor = vendors
      .filter(v => v.rating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    
    if (topVendor && topVendor.rating >= 4.7) {
      insights.push({
        type: "primary",
        text: `${topVendor.name} maintains highest performance rating at ${topVendor.rating?.toFixed(1)}. Consider priority partnership renewal.`
      });
    }

    const lowRatedVendors = vendors.filter(v => v.rating && v.rating < 4.0);
    if (lowRatedVendors.length > 0) {
      insights.push({
        type: "accent",
        text: `${lowRatedVendors.length} vendor${lowRatedVendors.length > 1 ? 's have' : ' has'} ratings below 4.0. Consider reviewing contracts or finding alternatives.`
      });
    }

    // 4. CRM conversion insight
    if (leads.length > 0 && clients.length > 0) {
      const actualConversionRate = (clients.length / (leads.length + clients.length)) * 100;
      if (actualConversionRate > 25) {
        insights.push({
          type: "primary",
          text: `Client conversion rate is ${actualConversionRate.toFixed(1)}% - excellent performance! Marketing and sales strategies are working well.`
        });
      } else if (actualConversionRate < 15) {
        insights.push({
          type: "accent",
          text: `Client conversion rate is ${actualConversionRate.toFixed(1)}%. Consider improving lead qualification and follow-up processes.`
        });
      }
    }

    // 5. Team insights
    const highPerformers = teamMembers.filter(m => 
      m.auraRating && parseFloat(m.auraRating) >= 4.5
    );
    
    if (highPerformers.length > 0 && teamMembers.length > 0) {
      const percentage = (highPerformers.length / teamMembers.length) * 100;
      insights.push({
        type: "primary",
        text: `${percentage.toFixed(0)}% of team members (${highPerformers.length}/${teamMembers.length}) have Aura ratings above 4.5. Strong team performance overall!`
      });
    }

    const lowPerformers = teamMembers.filter(m => 
      m.auraRating && parseFloat(m.auraRating) < 3.5
    );
    
    if (lowPerformers.length > 0) {
      insights.push({
        type: "accent",
        text: `${lowPerformers.length} team member${lowPerformers.length > 1 ? 's need' : ' needs'} performance support. Schedule one-on-one coaching sessions.`
      });
    }

    // 6. Budget insights
    const overBudgetProjects = projects.filter(p => {
      const spent = parseFloat(p.spent || '0');
      const budget = parseFloat(p.budget || '0');
      return budget > 0 && spent > budget;
    });

    if (overBudgetProjects.length > 0) {
      insights.push({
        type: "accent",
        text: `${overBudgetProjects.length} project${overBudgetProjects.length > 1 ? 's are' : ' is'} over budget. Implement stricter cost controls and approval processes.`
      });
    }

    // 7. Upcoming deadlines
    const now = new Date();
    const upcomingSoon = projects.filter(p => {
      if (!p.endDate || p.status === "Completed") return false;
      const endDate = new Date(p.endDate);
      const daysUntil = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 7;
    });

    if (upcomingSoon.length > 0) {
      insights.push({
        type: "accent",
        text: `${upcomingSoon.length} project${upcomingSoon.length > 1 ? 's have' : ' has'} deadlines within the next 7 days. Ensure teams are focused on final deliverables.`
      });
    }

    // 8. Growth opportunity
    if (leads.length > clients.length * 2) {
      insights.push({
        type: "primary",
        text: `Strong lead pipeline with ${leads.length} active leads. Consider adding sales resources to capitalize on opportunities.`
      });
    }

    // If no insights generated, provide default ones
    if (insights.length === 0) {
      insights.push(
        {
          type: "primary",
          text: "Welcome to Analytics! Start adding projects, team members, and leads to see AI-powered insights here."
        },
        {
          type: "accent",
          text: "The system will analyze your data in real-time and provide actionable recommendations to improve operations."
        }
      );
    }

    // Limit to top 6 insights
    return insights.slice(0, 6);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground">{stat.label}</p>
                <h2 className="mt-2">{stat.value}</h2>
                <p className={`${stat.color} mt-1`}>{stat.change}</p>
              </div>
              <div className={`${stat.color} opacity-80`}>
                <stat.icon className="w-8 h-8" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="mb-6">Revenue & Profit Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="var(--accent)"
                strokeWidth={2}
                name="Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Project Completion */}
        <Card className="p-6">
          <h3 className="mb-6">Project Completion Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="completed" fill="var(--primary)" name="Completed" />
              <Bar dataKey="onTrack" fill="var(--accent)" name="On Track" />
              <Bar dataKey="delayed" fill="var(--destructive)" name="Delayed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Projects by Phase */}
        <Card className="p-6">
          <h3 className="mb-6">Projects by Phase</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={phaseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="var(--primary)"
                dataKey="value"
              >
                {phaseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Client Conversion Funnel */}
        <Card className="p-6">
          <h3 className="mb-6">Client Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" />
              <YAxis dataKey="stage" type="category" stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Vendor Performance */}
      <Card className="p-6">
        <h3 className="mb-6">Top Vendor Performance</h3>
        <div className="space-y-4">
          {vendorPerformance.map((vendor, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border border-border"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span>{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p>{vendor.name}</p>
                  <p className="text-muted-foreground">{vendor.projects} projects completed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>
                      {i < Math.floor(vendor.rating) ? "★" : "☆"}
                    </span>
                  ))}
                </div>
                <span>{vendor.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Insights */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="mb-1" style={{ 
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--text-h3)',
              fontWeight: 'var(--font-weight-extrabold)',
              fontVariationSettings: "'wdth' 137"
            }}>
              Comprehensive AI Analysis
            </h3>
            <p className="text-muted-foreground">
              Powered by OpenAI GPT-5 • Detailed insights across operations, finance, team, CRM, and vendors
            </p>
          </div>
          <Button
            onClick={handleGenerateInsights}
            disabled={loadingInsights}
            size="lg"
            className="gap-2"
          >
            {loadingInsights ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Insights</span>
              </>
            )}
          </Button>
        </div>

        {aiInsights.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h4 className="mb-2" style={{ 
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--text-h4)',
              fontWeight: 'var(--font-weight-extrabold)',
              fontVariationSettings: "'wdth' 137"
            }}>
              AI-Powered Business Intelligence
            </h4>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Click "Generate Insights" to receive comprehensive analysis of your operations,
              financial performance, team productivity, CRM pipeline, and vendor relationships.
            </p>
            <Button
              onClick={handleGenerateInsights}
              disabled={loadingInsights}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-5 rounded-lg border transition-all hover:shadow-md ${
                  insight.type === "primary"
                    ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                    : "bg-destructive/5 border-destructive/30 hover:border-destructive/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`px-3 py-1 rounded-full uppercase shrink-0 mt-1 ${
                      insight.type === "primary"
                        ? "bg-primary/20 text-primary"
                        : "bg-destructive/20 text-destructive"
                    }`}
                    style={{
                      fontSize: 'var(--text-small)',
                      fontFamily: 'var(--font-family-body)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}
                  >
                    {insight.category || "General"}
                  </div>
                  <p className="flex-1 leading-relaxed">
                    {insight.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}