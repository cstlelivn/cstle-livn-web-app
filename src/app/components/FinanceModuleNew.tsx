import { useState, useEffect } from "react";
import {
  Plus,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import AddTransactionDialog from "./AddTransactionDialog";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client for real-time subscriptions
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

export default function FinanceModule() {
  const { projects, clients, vendors } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/transactions`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Delete transaction
  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/transactions/${transactionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      toast.success("Transaction deleted");
      fetchTransactions();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  // Calculate financial totals
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netProfit = totalIncome - totalExpenses;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get project name
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "General";
    const project = projects.find((p) => p.id === projectId);
    return project?.title || "Unknown Project";
  };

  // Calculate project finances
  const projectFinances = projects.map((project) => {
    const projectTransactions = transactions.filter((t) => t.project_id === project.id);
    const income = projectTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = projectTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const profit = income - expenses;
    const budget = Number(project.budget) || 0;
    const budgetRemaining = budget - expenses;

    return {
      project,
      income,
      expenses,
      profit,
      budget,
      budgetRemaining,
    };
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Finance</h1>
          <p className="text-muted-foreground">
            Manage income, expenses, and financial tracking
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="projects">Project Finances</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Income */}
            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total Income</p>
                  <h2 className="text-success">{formatCurrency(totalIncome)}</h2>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </Card>

            {/* Total Expenses */}
            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Total Expenses</p>
                  <h2 className="text-destructive">{formatCurrency(totalExpenses)}</h2>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </Card>

            {/* Net Profit */}
            <Card className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Net Profit</p>
                  <h2 className={netProfit >= 0 ? "text-success" : "text-destructive"}>
                    {formatCurrency(netProfit)}
                  </h2>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"
                  }`}
                >
                  <DollarSign
                    className={`h-6 w-6 ${
                      netProfit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="p-6 bg-card border border-border">
            <h3 className="mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex-1">
                    <p>{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {transaction.category.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getProjectName(transaction.project_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        transaction.type === "income" ? "text-success" : "text-destructive"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount))}
                    </p>
                  </div>
                </div>
              ))}

              {transactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Add your first transaction to get started.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-card border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-border">
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {transaction.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{getProjectName(transaction.project_id)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={transaction.type === "income" ? "default" : "secondary"}
                        className={
                          transaction.type === "income"
                            ? "bg-success text-white"
                            : "bg-destructive text-white"
                        }
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        transaction.type === "income" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={transaction.status === "Completed" ? "default" : "outline"}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found. Add your first transaction above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Project Finances Tab */}
        <TabsContent value="projects" className="space-y-4">
          {projectFinances.map((pf) => (
            <Card key={pf.project.id} className="p-6 bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3>{pf.project.title}</h3>
                  <p className="text-sm text-muted-foreground">{pf.project.address}</p>
                </div>
                <Badge
                  variant="outline"
                  className={pf.profit >= 0 ? "text-success" : "text-destructive"}
                >
                  {pf.profit >= 0 ? "Profitable" : "Loss"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p>{formatCurrency(pf.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-success">{formatCurrency(pf.income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-destructive">{formatCurrency(pf.expenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit/Loss</p>
                  <p className={pf.profit >= 0 ? "text-success" : "text-destructive"}>
                    {formatCurrency(pf.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget Remaining</p>
                  <p className={pf.budgetRemaining >= 0 ? "text-success" : "text-destructive"}>
                    {formatCurrency(pf.budgetRemaining)}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {projects.length === 0 && (
            <Card className="p-8 bg-card border border-border text-center">
              <p className="text-muted-foreground">
                No projects yet. Create a project to start tracking project finances.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        projects={projects}
        clients={clients}
        vendors={vendors}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
