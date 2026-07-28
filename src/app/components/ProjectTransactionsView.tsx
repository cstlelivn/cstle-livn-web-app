import { useState, useEffect } from "react";
import { Receipt, Calendar, DollarSign, Trash2, Filter, Edit2, Package, CreditCard } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import EditProjectTransactionDialog from "./EditProjectTransactionDialog";
import { 
  getProjectTransactions, 
  deleteProjectTransaction, 
  type ProjectTransaction,
  type TransactionType 
} from "../src/features/transactions/projectTransactionsApi";
import { formatDateTime } from "../src/lib/dateFormatter";

interface ProjectTransactionsViewProps {
  projectId: string;
  projectPhases: string[];
  onTransactionChange?: () => void;
}

export default function ProjectTransactionsView({ projectId, projectPhases, onTransactionChange }: ProjectTransactionsViewProps) {
  const { inventory } = useApp();
  
  const [transactions, setTransactions] = useState<ProjectTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ProjectTransaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<ProjectTransaction | null>(null);

  // Load transactions
  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading transactions for project:', projectId);
      const data = await getProjectTransactions(projectId);
      console.log('✅ Transactions loaded:', data.length, 'items', data);
      setTransactions(data);
    } catch (error: any) {
      console.error("❌ Error loading transactions:", error);
      toast.error(`Failed to load transactions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadTransactions();
      
      // Setup realtime subscription for project_transactions
      const supabase = (window as any).__supabase;
      if (supabase) {
        const channel = supabase
          .channel(`project_transactions_project_${projectId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'project_transactions',
              filter: `project_id=eq.${projectId}`,
            },
            (payload: any) => {
              console.log('Transaction change detected:', payload);
              loadTransactions();
              onTransactionChange?.();
            }
          )
          .subscribe((status: string, error: any) => {
            // Handle subscription errors gracefully
            if (error) {
              console.warn('⚠️ Realtime subscription error (table may not exist yet):', error);
            }
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to project_transactions changes');
            }
          });

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [projectId]);

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    if (filterPhase !== "all" && transaction.phaseName !== filterPhase) return false;
    if (filterType !== "all" && transaction.transactionType !== filterType) return false;
    
    if (filterDateFrom) {
      const transactionDate = new Date(transaction.date); // Changed from transactionDate to date
      const fromDate = new Date(filterDateFrom);
      if (transactionDate < fromDate) return false;
    }
    
    if (filterDateTo) {
      const transactionDate = new Date(transaction.date); // Changed from transactionDate to date
      const toDate = new Date(filterDateTo);
      if (transactionDate > toDate) return false;
    }
    
    return true;
  });

  // Calculate totals
  const totalSpent = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0); // Changed from totalCost to amount
  const totalPurchases = filteredTransactions.filter(t => t.transactionType === "purchase").reduce((sum, t) => sum + t.amount, 0); // Changed from totalCost to amount
  const totalPayments = filteredTransactions.filter(t => t.transactionType === "payment").reduce((sum, t) => sum + t.amount, 0); // Changed from totalCost to amount

  // Handle delete
  const handleDeleteClick = (transaction: ProjectTransaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;

    try {
      await deleteProjectTransaction(selectedTransaction.id);
      toast.success("Transaction deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
      loadTransactions(); // Reload
      onTransactionChange?.(); // Notify parent
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast.error(`Failed to delete transaction: ${error.message}`);
    }
  };

  // Handle edit
  const handleEditClick = (transaction: ProjectTransaction) => {
    setTransactionToEdit(transaction);
    setEditDialogOpen(true);
  };

  const handleConfirmEdit = () => {
    setEditDialogOpen(false);
    setTransactionToEdit(null);
    loadTransactions(); // Reload
    onTransactionChange?.(); // Notify parent
  };

  return (
    <div className="space-y-[16px]">
      {/* Filters */}
      <Card className="p-[16px]">
        <div className="flex items-center gap-[12px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span
            style={{
              fontFamily: "var(--font-family-heading)",
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-bold)",
              fontVariationSettings: "'wdth' 137",
            }}
          >
            FILTERS
          </span>
        </div>

        <div className="grid grid-cols-4 gap-[12px] mt-[12px]">
          {/* Type Filter */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Type
            </label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phase Filter */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Phase
            </label>
            <Select value={filterPhase} onValueChange={setFilterPhase}>
              <SelectTrigger
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {projectPhases.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              From Date
            </label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Date To */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              To Date
            </label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-[12px]">
        {/* Total Spent */}
        <Card className="p-[16px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[12px]">
              <DollarSign className="w-5 h-5 text-accent" />
              <span
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                }}
              >
                TOTAL SPENT
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--accent)",
              }}
            >
              ${totalSpent.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* Total Purchases */}
        <Card className="p-[16px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[12px]">
              <Package className="w-5 h-5 text-primary" />
              <span
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                }}
              >
                PURCHASES
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--primary)",
              }}
            >
              ${totalPurchases.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* Total Payments */}
        <Card className="p-[16px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[12px]">
              <CreditCard className="w-5 h-5 text-destructive" />
              <span
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                }}
              >
                PAYMENTS
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--destructive)",
              }}
            >
              ${totalPayments.toFixed(2)}
            </span>
          </div>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="p-[16px]">
        {isLoading ? (
          <div
            className="text-center py-[32px]"
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
              color: "var(--muted-foreground)",
            }}
          >
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div
            className="text-center py-[32px]"
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
              color: "var(--muted-foreground)",
            }}
          >
            No transactions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Type</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Date</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Vendor/Recipient</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Item/Description</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Phase</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Qty</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Unit Cost</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Total Cost</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}>Notes</TableHead>
                <TableHead style={{ fontSize: "var(--text-label)" }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => handleEditClick(transaction)}>
                  <TableCell>
                    <Badge
                      variant={transaction.transactionType === "purchase" ? "default" : "secondary"}
                      style={{
                        fontFamily: "var(--font-family-body)",
                        fontSize: "var(--text-small)",
                        textTransform: "capitalize",
                      }}
                    >
                      {transaction.transactionType === "purchase" ? (
                        <><Package className="w-3 h-3 mr-1 inline" />Purchase</>
                      ) : (
                        <><CreditCard className="w-3 h-3 mr-1 inline" />Payment</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {formatDateTime(transaction.date)}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {transaction.vendorOrRecipient}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {transaction.itemOrDescription}
                  </TableCell>
                  <TableCell>
                    {transaction.phaseName ? (
                      <Badge
                        variant="outline"
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-small)",
                        }}
                      >
                        {transaction.phaseName}
                      </Badge>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)" }}>—</span>
                    )}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {transaction.quantity || "—"}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {transaction.unitCost !== undefined && transaction.unitCost !== null
                      ? `$${transaction.unitCost.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    ${transaction.amount?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <div className="flex items-center gap-[8px]">
                      {transaction.notes || "—"}
                      {transaction.inventoryId && (
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                          style={{
                            fontFamily: "var(--font-family-body)",
                          }}
                        >
                          <Package className="w-2 h-2 mr-1" />
                          Inv
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-[4px]">
                      <Button
                        onClick={() => handleEditClick(transaction)}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px] text-accent hover:bg-accent/10"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(transaction)}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px] text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                fontFamily: "var(--font-family-heading)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--font-weight-extrabold)",
                fontVariationSettings: "'wdth' 137",
              }}
            >
              Delete Transaction?
            </AlertDialogTitle>
            <AlertDialogDescription
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              This will reduce the project spend by $
              {selectedTransaction?.amount?.toFixed(2) || "0.00"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <EditProjectTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={transactionToEdit}
        projectPhases={projectPhases}
        onSuccess={handleConfirmEdit}
      />
    </div>
  );
}