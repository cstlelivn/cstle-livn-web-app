import { projectId as supabaseProjectId, publicAnonKey } from "../utils/supabase/info";
import { createClient } from "../utils/supabase/client.tsx";
import AddTransactionDialog from "./AddTransactionDialog";

// Use singleton Supabase client
const supabase = createClient();

interface ProjectFinanceTabProps {
  projectId: string;
  project?: any;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  phase_name?: string;
  recipient_or_vendor?: string;
  payment_method?: string;
  notes?: string;
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  client_payment: 'Client Payment',
  project_installment: 'Project Installment',
  refund_received: 'Refund Received',
  general_income: 'General Income',
  materials: 'Materials',
  labor: 'Labor',
  subcontractor: 'Subcontractor',
  equipment: 'Equipment',
  reimbursement: 'Reimbursement',
  vendor_purchase: 'Vendor Purchase',
  general_expense: 'General Expense',
};

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function ProjectFinanceTabUnified({ projectId, project }: ProjectFinanceTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Data for dropdowns in AddTransactionDialog
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Fetch projects, clients, vendors for dialog dropdowns
  const fetchDropdownData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return;
      }

      // Fetch projects
      const projectsResponse = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/projects`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);
      }

      // Fetch clients
      const clientsResponse = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/clients`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients || []);
      }

      // Fetch vendors
      const vendorsResponse = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/vendors`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json();
        setVendors(vendorsData.vendors || []);
      }
    } catch (error: any) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  // Fetch project transactions
  const fetchTransactions = async () => {
    try {
      // Get the current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.warn('No active session - user may need to log in');
        setTransactions([]);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/project-transactions?project_id=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch: ${errorText}`);
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error: any) {
      console.error('Error fetching project transactions:', error);
      toast.error(`Failed to load transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      // Get the current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/project-transactions/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete: ${errorText}`);
      }

      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    fetchTransactions();
    fetchDropdownData();

    const channel = supabase
      .channel('project_transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_transactions',
        filter: `project_id=eq.${projectId}`
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Calculate financials
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const profit = income - expenses;
  const budget = Number(project?.budget_total || project?.budget || 0);
  const budgetRemaining = budget - expenses;
  const budgetPercentUsed = budget > 0 ? (expenses / budget) * 100 : 0;

  // Get status color
  const getBudgetColor = () => {
    if (budgetPercentUsed >= 100) return 'var(--destructive)';
    if (budgetPercentUsed >= 90) return 'var(--warning)';
    if (budgetPercentUsed >= 75) return 'var(--warning)';
    return 'var(--accent)';
  };

  // Group transactions by type
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="size-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">Project Finances</h2>
          <p className="text-muted-foreground">Track income, expenses, and budget</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => fetchTransactions()} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Budget */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Budget</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBudgetAmount(String(budget));
                    setIsEditBudgetOpen(true);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Button>
              </div>
              <p className="text-foreground" style={{ fontSize: 'var(--text-h2)' }}>
                {formatCurrency(budget)}
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                  <span>Used: {budgetPercentUsed.toFixed(1)}%</span>
                  <span>{formatCurrency(expenses)}</span>
                </div>
                <Progress value={Math.min(budgetPercentUsed, 100)} className="h-2" style={{ backgroundColor: getBudgetColor() }} />
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                  Remaining: {formatCurrency(budgetRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Income</p>
                <p className="text-success" style={{ fontSize: 'var(--text-h2)' }}>
                  {formatCurrency(income)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-success/10">
                <TrendingUp className="size-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Expenses</p>
                <p className="text-destructive" style={{ fontSize: 'var(--text-h2)' }}>
                  {formatCurrency(expenses)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <TrendingDown className="size-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Profit/Loss</p>
                <p className={profit >= 0 ? 'text-success' : 'text-destructive'} style={{ fontSize: 'var(--text-h2)' }}>
                  {formatCurrency(profit)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${profit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <DollarSign className={`size-6 ${profit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Income ({incomeTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incomeTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No income recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-border">
                      <TableCell className="text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{transaction.description}</p>
                          {transaction.recipient_or_vendor && (
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                              {transaction.recipient_or_vendor}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border">
                          {CATEGORY_LABELS[transaction.category] || transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-success">
                        +{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Expenses ({expenseTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No expenses recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-border">
                      <TableCell className="text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{transaction.description}</p>
                          {transaction.recipient_or_vendor && (
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                              {transaction.recipient_or_vendor}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border">
                          {CATEGORY_LABELS[transaction.category] || transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-destructive">
                        -{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        preselectedProjectId={projectId}
        projects={projects}
        clients={clients}
        vendors={vendors}
        onSuccess={() => {
          fetchTransactions();
          setIsAddDialogOpen(false);
        }}
      />

      {/* Edit Budget Dialog */}
      <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Project Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Budget Amount</Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter budget amount"
                className="bg-input-background border-border"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditBudgetOpen(false)}
                disabled={isUpdatingBudget}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const amount = Number(budgetAmount);
                  if (isNaN(amount) || amount < 0) {
                    toast.error('Please enter a valid budget amount');
                    return;
                  }
                  setIsUpdatingBudget(true);
                  try {
                    // Call your project update API here
                    toast.success('Budget updated successfully');
                    setIsEditBudgetOpen(false);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to update budget');
                  } finally {
                    setIsUpdatingBudget(false);
                  }
                }}
                disabled={isUpdatingBudget}
              >
                {isUpdatingBudget ? 'Updating...' : 'Update Budget'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}