import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Receipt, Plus, Edit, Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import RecordPaymentDialog from "./RecordPaymentDialog";
import RecordExpenseDialog from "./RecordExpenseDialog";
import { getProjectTransactions, deleteProjectTransaction, getTransactionsByType } from "../src/features/transactions/projectTransactionsApi";
import { useProjectTransactions } from "../src/features/transactions/useProjectTransactions";
import { formatDateTime } from "../src/lib/dateFormatter";

interface ProjectFinanceTabProps {
  projectId: number;
}

export default function ProjectFinanceTab({ projectId }: ProjectFinanceTabProps) {
  const { projects, updateProject, clients } = useApp();
  const project = projects.find(p => p.id === projectId);
  
  // Use realtime hook for transactions
  const { transactions: allTransactions, loading: loadingTransactions } = useProjectTransactions(String(projectId));
  
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);

  if (!project) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>
          Project not found
        </p>
      </div>
    );
  }

  // Find the client UUID by matching the client name
  const projectClient = clients.find(c => c.name === project.client || String(c.id) === String(project.client));
  const clientUuid = projectClient?.id ? String(projectClient.id) : undefined;

  // Separate payments and expenses from transactions
  const payments = allTransactions.filter(t => t.transactionType === 'payment');
  const expenses = allTransactions.filter(t => t.transactionType === 'purchase');

  // Calculate all financial totals from REAL DATA
  const budgetTotal = Number(project.budget_total || 0);
  
  // Budget Spent = Sum of all purchases (expenses)
  const budgetSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  
  // Budget Remaining = Budget Total - Budget Spent
  const budgetRemaining = budgetTotal - budgetSpent;
  
  // Budget % Used
  const budgetPercentUsed = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  
  // Payments Received = Sum of all payments
  const totalPaymentsReceived = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  
  // Total Expenses (same as budgetSpent)
  const totalExpenses = budgetSpent;
  
  // Profit/Loss = Payments Received - Budget Spent
  const profitLoss = totalPaymentsReceived - budgetSpent;

  // Budget status color
  const getBudgetStatusColor = () => {
    if (budgetPercentUsed >= 100) return 'var(--destructive)';
    if (budgetPercentUsed >= 90) return '#F59E0B';
    if (budgetPercentUsed >= 75) return '#FBBF24';
    return 'var(--accent)';
  };

  const handleUpdateBudget = async () => {
    const amount = Number(budgetAmount);
    
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    
    setIsUpdatingBudget(true);
    
    try {
      await updateProject(projectId, { budget_total: amount });
      toast.success("Budget updated successfully");
      setIsEditBudgetOpen(false);
      setBudgetAmount("");
    } catch (error: any) {
      console.error('Failed to update budget:', error);
      toast.error(error.message || "Failed to update budget");
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransactionId) return;
    
    setIsDeletingTransaction(true);
    
    try {
      await deleteProjectTransaction(deletingTransactionId);
      
      toast.success("Transaction deleted successfully", {
        description: "Finance totals have been updated automatically.",
        duration: 3000,
      });
      
      setDeletingTransactionId(null);
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      toast.error(error.message || "Failed to delete transaction");
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: '24px' }}>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ 
          fontFamily: 'var(--font-family-heading)', 
          fontSize: 'var(--text-h3)',
          fontWeight: 'var(--font-weight-extrabold)',
          color: 'var(--foreground)'
        }}>
          Project Finances
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            onClick={() => setIsRecordPaymentOpen(true)}
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsRecordExpenseOpen(true)}
            style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Budget Total */}
        <Card className="p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
                Total Budget
              </p>
              <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--foreground)' }}>
                ${budgetTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBudgetAmount(String(budgetTotal));
                setIsEditBudgetOpen(true);
              }}
              style={{ padding: '6px' }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Budget Spent */}
        <Card className="p-6">
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
              Budget Spent
            </p>
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--foreground)' }}>
              ${budgetSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <Progress value={budgetPercentUsed} className="h-2" />
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginTop: '8px' }}>
            {budgetPercentUsed.toFixed(1)}% of budget used
          </p>
        </Card>

        {/* Budget Remaining */}
        <Card className="p-6">
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
            Budget Remaining
          </p>
          <p style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-h2)', 
            fontWeight: 'var(--font-weight-extrabold)',
            color: getBudgetStatusColor()
          }}>
            ${budgetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginTop: '8px' }}>
            {budgetRemaining >= 0 ? 'Within Budget' : 'Over Budget'}
          </p>
        </Card>

        {/* Profit/Loss */}
        <Card className="p-6">
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginBottom: '4px' }}>
            Profit / Loss
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {profitLoss >= 0 ? (
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            ) : (
              <TrendingDown className="w-6 h-6" style={{ color: 'var(--destructive)' }} />
            )}
            <p style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-h2)', 
              fontWeight: 'var(--font-weight-extrabold)',
              color: profitLoss >= 0 ? 'var(--accent)' : 'var(--destructive)'
            }}>
              {profitLoss >= 0 ? '+' : '-'}${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginTop: '8px' }}>
            {profitLoss >= 0 ? 'Profit' : 'Loss'}
          </p>
        </Card>
      </div>

      {/* Payments and Expenses Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments Received */}
        <Card className="p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Payments Received
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent)' }}>
                ${totalPaymentsReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {loadingTransactions ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : payments.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px' }}>
              No payments recorded yet
            </p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {payments.map((payment) => (
                <div 
                  key={payment.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                      {payment.itemOrDescription}
                    </p>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      {payment.vendorOrRecipient} • {formatDateTime(payment.date)}
                    </p>
                    {payment.phaseName && (
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--accent)', marginTop: '2px' }}>
                        Phase: {payment.phaseName}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent)' }}>
                      +${Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingTransactionId(payment.id)}
                      style={{ padding: '6px', color: 'var(--destructive)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expenses */}
        <Card className="p-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Expenses
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt className="w-5 h-5" style={{ color: 'var(--destructive)' }} />
              <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--destructive)' }}>
                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {loadingTransactions ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : expenses.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px' }}>
              No expenses recorded yet
            </p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {expenses.map((expense) => (
                <div 
                  key={expense.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>
                      {expense.itemOrDescription}
                    </p>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      {expense.vendorOrRecipient} • {formatDateTime(expense.date)}
                    </p>
                    {expense.phaseName && (
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--accent)', marginTop: '2px' }}>
                        Phase: {expense.phaseName}
                      </p>
                    )}
                    {expense.quantity && expense.unitCost && (
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                        {expense.quantity} × ${expense.unitCost.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--destructive)' }}>
                      -${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingTransactionId(expense.id)}
                      style={{ padding: '6px', color: 'var(--destructive)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        projectId={String(projectId)}
        clientId={clientUuid}
      />
      
      <RecordExpenseDialog
        isOpen={isRecordExpenseOpen}
        onClose={() => setIsRecordExpenseOpen(false)}
        projectId={String(projectId)}
      />

      {/* Edit Budget Dialog */}
      <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Update Project Budget
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
              Set the total budget for this project
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Budget Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
                disabled={isUpdatingBudget}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsEditBudgetOpen(false)} 
                disabled={isUpdatingBudget}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateBudget} 
                disabled={isUpdatingBudget}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
              >
                {isUpdatingBudget ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Budget'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={!!deletingTransactionId} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Delete Transaction
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
              Are you sure you want to delete this transaction? This action cannot be undone and will automatically recalculate all finance totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeletingTransaction}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              disabled={isDeletingTransaction}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)',
                backgroundColor: 'var(--destructive)',
                color: 'white'
              }}
            >
              {isDeletingTransaction ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Transaction'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}