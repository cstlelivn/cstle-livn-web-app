import { useState, useEffect } from 'react';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client.tsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { RefreshCw, Plus, TrendingUp, TrendingDown, DollarSign, Receipt, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AddTransactionDialog from './AddTransactionDialog';

// Use singleton Supabase client
const supabase = createClient();

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  project_id?: string;
  client_id?: string;
  vendor_id?: string;
  phase_name?: string;
  notes?: string;
  payment_method?: string;
  recipient_or_vendor?: string;
  project?: { id: string; title: string };
  client?: { id: string; name: string };
  vendor?: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

// Category labels for display
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

// Format date to MM/DD/YYYY, h:mm A
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

export default function FinanceModule() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch all transactions
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
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/transactions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch transactions: ${errorText}`);
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
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
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-bcab437c/transactions/${id}`,
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
      toast.error(`Failed to delete transaction: ${error.message}`);
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    fetchTransactions();
    fetchDropdownData();

    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, (payload) => {
        console.log('Transaction change detected:', payload);
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netProfit = totalIncome - totalExpenses;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.recipient_or_vendor?.toLowerCase().includes(query) ||
        t.project?.title?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate category breakdowns
  const incomeByCategory = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  // Monthly data for charts
  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { month, income: 0, expenses: 0 };
    }
    if (t.type === 'income') {
      acc[month].income += Number(t.amount);
    } else {
      acc[month].expenses += Number(t.amount);
    }
    return acc;
  }, {} as Record<string, { month: string; income: number; expenses: number }>);

  const chartData = Object.values(monthlyData).slice(-6); // Last 6 months

  // Category chart data
  const incomeCategoryData = Object.entries(incomeByCategory).map(([category, amount]) => ({
    name: CATEGORY_LABELS[category] || category,
    value: amount
  }));

  const expenseCategoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: CATEGORY_LABELS[category] || category,
    value: amount
  }));

  const COLORS = ['#748B7B', '#848580', '#6B7280', '#9CA3AF', '#D1D5DB'];

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
          <h1 className="text-foreground">Finance</h1>
          <p className="text-muted-foreground">Track income, expenses, and profitability</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-card">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground">Total Income</p>
                    <p className="text-success" style={{ fontSize: 'var(--text-h2)' }}>
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-success/10">
                    <TrendingUp className="size-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground">Total Expenses</p>
                    <p className="text-destructive" style={{ fontSize: 'var(--text-h2)' }}>
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-destructive/10">
                    <TrendingDown className="size-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground">Net Profit</p>
                    <p className={netProfit >= 0 ? 'text-success' : 'text-destructive'} style={{ fontSize: 'var(--text-h2)' }}>
                      {formatCurrency(netProfit)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <DollarSign className={`size-6 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income vs Expenses Over Time */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Income vs Expenses (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="var(--success)" name="Income" />
                    <Bar dataKey="expenses" fill="var(--destructive)" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Last 5 transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                          <Receipt className={`size-4 ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`} />
                        </div>
                        <div>
                          <p className="text-foreground">{transaction.description}</p>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                            {CATEGORY_LABELS[transaction.category] || transaction.category}
                            {transaction.project && ` • ${transaction.project.title}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={transaction.type === 'income' ? 'text-success' : 'text-destructive'}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-muted-foreground mb-2 block" style={{ fontSize: 'var(--text-label)' }}>Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-input-background border-border">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-muted-foreground mb-2 block" style={{ fontSize: 'var(--text-label)' }}>Category</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="bg-input-background border-border">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-muted-foreground mb-2 block" style={{ fontSize: 'var(--text-label)' }}>Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-input-background border-border">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-muted-foreground mb-2 block" style={{ fontSize: 'var(--text-label)' }}>Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-input-background border-border"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
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
                        <TableCell className="text-muted-foreground">
                          {transaction.project?.title || '-'}
                        </TableCell>
                        <TableCell>
                          {transaction.type === 'income' ? (
                            <Badge className="bg-success/10 text-success border-success/20">Income</Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expense</Badge>
                          )}
                        </TableCell>
                        <TableCell className={transaction.type === 'income' ? 'text-success' : 'text-destructive'}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={transaction.status === 'Completed' ? 'default' : 'outline'}
                            className="border-border"
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Category Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income by Category */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Categories Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Income Sources */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Top Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(incomeByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <p className="text-foreground">{CATEGORY_LABELS[category] || category}</p>
                        <p className="text-success">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Expense Categories */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <p className="text-foreground">{CATEGORY_LABELS[category] || category}</p>
                        <p className="text-destructive">{formatCurrency(amount)}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          fetchTransactions();
          setIsAddDialogOpen(false);
        }}
        projects={projects}
        clients={clients}
        vendors={vendors}
      />
    </div>
  );
}