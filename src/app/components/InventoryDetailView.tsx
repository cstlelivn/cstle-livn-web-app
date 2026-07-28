import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Package, TrendingUp, TrendingDown, AlertTriangle, History, Calendar, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { 
  receiveStock, 
  issueStock, 
  adjustStock,
  type InventoryTransaction 
} from "../src/features/inventory/transactionsApi";
import { getInventoryItem, deleteInventoryItem } from "../src/features/inventory/api";
import { useInventoryTransactions } from "../src/features/inventory/useInventoryTransactions";
import { useApp } from "./AppContext";

interface InventoryDetailViewProps {
  inventoryId: string | number;
  onBack: () => void;
  onEdit: (id: string | number) => void;
  onRefresh: () => void;
}

export default function InventoryDetailView({ inventoryId, onBack, onEdit, onRefresh }: InventoryDetailViewProps) {
  const { deleteInventoryItem: deleteFromContext } = useApp();
  const [item, setItem] = useState<any>(null);
  const [isItemLoading, setIsItemLoading] = useState(true);
  
  // Use realtime hook for transactions
  const { transactions, loading: transactionsLoading, refresh: refreshTransactions } = useInventoryTransactions(
    inventoryId as string
  );
  
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Stock movement form states
  const [receiveForm, setReceiveForm] = useState({ quantity: 0, reference: "", notes: "" });
  const [issueForm, setIssueForm] = useState({ quantity: 0, reference: "", notes: "" });
  const [adjustForm, setAdjustForm] = useState({ quantityChange: 0, reason: "", reference: "" });

  const isLoading = isItemLoading || transactionsLoading;

  // Load item data
  const loadItem = async () => {
    try {
      setIsItemLoading(true);
      const itemData = await getInventoryItem(inventoryId as string);
      setItem(itemData);
    } catch (error: any) {
      toast.error(`Failed to load item: ${error.message}`);
    } finally {
      setIsItemLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [inventoryId]);

  // Handle receiving stock
  const handleReceive = async () => {
    if (receiveForm.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    try {
      await receiveStock(
        inventoryId as string,
        receiveForm.quantity,
        receiveForm.reference || undefined,
        receiveForm.notes || undefined
      );
      toast.success("Stock received successfully");
      setIsReceiveDialogOpen(false);
      setReceiveForm({ quantity: 0, reference: "", notes: "" });
      // Refresh item data to get updated quantity
      await loadItem();
      // Transactions will update automatically via realtime
      onRefresh(); // Refresh parent inventory list
    } catch (error: any) {
      toast.error(`Failed to receive stock: ${error.message}`);
    }
  };

  // Handle issuing stock
  const handleIssue = async () => {
    if (issueForm.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (item && issueForm.quantity > item.quantity) {
      toast.error(`Cannot issue more than available quantity (${item.quantity} ${item.unit})`);
      return;
    }

    try {
      await issueStock(
        inventoryId as string,
        issueForm.quantity,
        issueForm.reference || undefined,
        issueForm.notes || undefined
      );
      toast.success("Stock issued successfully");
      setIsIssueDialogOpen(false);
      setIssueForm({ quantity: 0, reference: "", notes: "" });
      // Refresh item data to get updated quantity
      await loadItem();
      // Transactions will update automatically via realtime
      onRefresh(); // Refresh parent inventory list
    } catch (error: any) {
      toast.error(`Failed to issue stock: ${error.message}`);
    }
  };

  // Handle adjusting stock
  const handleAdjust = async () => {
    if (!adjustForm.reason.trim()) {
      toast.error("Reason is required for stock adjustments");
      return;
    }

    if (adjustForm.quantityChange === 0) {
      toast.error("Quantity change cannot be zero");
      return;
    }

    try {
      await adjustStock(
        inventoryId as string,
        adjustForm.quantityChange,
        adjustForm.reason,
        adjustForm.reference || undefined
      );
      toast.success("Stock adjusted successfully");
      setIsAdjustDialogOpen(false);
      setAdjustForm({ quantityChange: 0, reason: "", reference: "" });
      // Refresh item data to get updated quantity
      await loadItem();
      // Transactions will update automatically via realtime
      onRefresh(); // Refresh parent inventory list
    } catch (error: any) {
      toast.error(`Failed to adjust stock: ${error.message}`);
    }
  };

  // Handle deleting item
  const handleDelete = async () => {
    try {
      await deleteFromContext(inventoryId as number);
      toast.success("Inventory item deleted successfully");
      setIsDeleteDialogOpen(false);
      onBack(); // Go back to inventory list
    } catch (error: any) {
      toast.error(`Failed to delete item: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-[16px]">
        <p className="text-muted-foreground">Item not found</p>
        <Button onClick={onBack} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  // Calculate status
  const status = item.status || (
    item.type === "Equipment" 
      ? (item.assignedTo ? "In Use" : "Available")
      : (item.quantity <= item.minStock * 0.3 ? "Critical" : 
         item.quantity <= item.minStock * 0.6 ? "Low Stock" : "In Stock")
  );

  const isLowStock = item.quantity <= item.minStock;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <div className="flex items-center gap-[16px]">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="h-[32px]"
          >
            <ArrowLeft className="w-4 h-4 mr-[8px]" />
            Back to Inventory
          </Button>
          <h2 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            {item.name}
          </h2>
        </div>
        <div className="flex items-center gap-[8px]">
          <Button
            onClick={() => onEdit(inventoryId)}
            variant="outline"
            size="sm"
            className="h-[32px]"
          >
            <Edit className="w-4 h-4 mr-[8px]" />
            Edit Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* Left Column - Item Details */}
        <div className="lg:col-span-2 space-y-[24px]">
          {/* Summary Card */}
          <Card className="p-[24px]">
            <div className="flex items-start justify-between mb-[20px]">
              <div>
                <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                  Item Details
                </h3>
                <p className="text-muted-foreground mt-[4px]">
                  Complete information about this inventory item
                </p>
              </div>
              <Badge
                variant={
                  status === "Critical" ? "destructive" :
                  status === "Low Stock" ? "destructive" :
                  status === "Available" ? "default" :
                  "secondary"
                }
              >
                {status}
              </Badge>
            </div>

            {isLowStock && (
              <div className="mb-[20px] p-[12px] bg-destructive/10 border border-destructive/20 rounded-[8px] flex items-start gap-[8px]">
                <AlertTriangle className="w-4 h-4 text-destructive mt-[2px] shrink-0" />
                <div className="flex-1">
                  <p className="text-destructive">
                    Low Stock Alert
                  </p>
                  <p className="text-muted-foreground mt-[4px]">
                    Current quantity ({item.quantity} {item.unit}) is below or at reorder level ({item.minStock} {item.unit})
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="mt-[4px]">{item.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Category</Label>
                <p className="mt-[4px]">{item.category}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Location</Label>
                <p className="mt-[4px]">{item.location || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Unit Cost</Label>
                <p className="mt-[4px]">${item.cost?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Current Quantity</Label>
                <p className="mt-[4px]">
                  {item.quantity} {item.unit}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Reorder Level</Label>
                <p className="mt-[4px]">
                  {item.minStock} {item.unit}
                </p>
              </div>
              {item.assignedTo && (
                <div>
                  <Label className="text-muted-foreground">Assigned To</Label>
                  <p className="mt-[4px]">{item.assignedTo}</p>
                </div>
              )}
              {item.lastRestocked && (
                <div>
                  <Label className="text-muted-foreground">Last Restocked</Label>
                  <p className="mt-[4px]">
                    {new Date(item.lastRestocked).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Total Value</Label>
                <p className="mt-[4px]">
                  ${((item.quantity || 0) * (item.cost || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {/* Transaction History */}
          <Card className="p-[24px]">
            <div className="flex items-center gap-[8px] mb-[20px]">
              <History className="w-4 h-4" />
              <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                Transaction History
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-[32px] text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-[8px] opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-[8px] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Quantity After</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {new Date(tx.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={tx.quantityChange > 0 ? "text-success" : "text-destructive"}>
                            {tx.quantityChange > 0 ? "+" : ""}
                            {tx.quantityChange} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.quantityAfter} {item.unit}
                        </TableCell>
                        <TableCell>{tx.reference || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-[16px]">
          <Card className="p-[20px]">
            <h4 className="mb-[16px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
              Stock Actions
            </h4>
            <div className="space-y-[8px]">
              <Button
                onClick={() => setIsReceiveDialogOpen(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 mr-[8px]" />
                Receive Stock
              </Button>
              <Button
                onClick={() => setIsIssueDialogOpen(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <TrendingDown className="w-4 h-4 mr-[8px]" />
                Issue / Use Stock
              </Button>
              <Button
                onClick={() => setIsAdjustDialogOpen(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <Package className="w-4 h-4 mr-[8px]" />
                Adjust Stock
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Receive Stock Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
            <DialogDescription>
              Add stock to {item.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-[16px] py-[16px]">
            <div>
              <Label htmlFor="receive-quantity">Quantity to Receive *</Label>
              <Input
                id="receive-quantity"
                type="number"
                min="1"
                value={receiveForm.quantity || ""}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: parseFloat(e.target.value) || 0 })}
                placeholder={`Enter quantity in ${item.unit}`}
              />
            </div>
            <div>
              <Label htmlFor="receive-reference">Reference (Invoice #, PO #, etc.)</Label>
              <Input
                id="receive-reference"
                value={receiveForm.reference}
                onChange={(e) => setReceiveForm({ ...receiveForm, reference: e.target.value })}
                placeholder="e.g., INV-12345"
              />
            </div>
            <div>
              <Label htmlFor="receive-notes">Notes</Label>
              <Textarea
                id="receive-notes"
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receiveForm.quantity <= 0}>
              Receive Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Stock Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue / Use Stock</DialogTitle>
            <DialogDescription>
              Remove stock from {item.name} (Available: {item.quantity} {item.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-[16px] py-[16px]">
            <div>
              <Label htmlFor="issue-quantity">Quantity to Issue *</Label>
              <Input
                id="issue-quantity"
                type="number"
                min="1"
                max={item.quantity}
                value={issueForm.quantity || ""}
                onChange={(e) => setIssueForm({ ...issueForm, quantity: parseFloat(e.target.value) || 0 })}
                placeholder={`Enter quantity in ${item.unit}`}
              />
            </div>
            <div>
              <Label htmlFor="issue-reference">Reference (Project, Work Order, etc.)</Label>
              <Input
                id="issue-reference"
                value={issueForm.reference}
                onChange={(e) => setIssueForm({ ...issueForm, reference: e.target.value })}
                placeholder="e.g., Project ABC"
              />
            </div>
            <div>
              <Label htmlFor="issue-notes">Notes</Label>
              <Textarea
                id="issue-notes"
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleIssue} 
              disabled={issueForm.quantity <= 0 || issueForm.quantity > item.quantity}
            >
              Issue Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust stock for {item.name} (Current: {item.quantity} {item.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-[16px] py-[16px]">
            <div>
              <Label htmlFor="adjust-quantity">Quantity Change (+ or -) *</Label>
              <Input
                id="adjust-quantity"
                type="number"
                value={adjustForm.quantityChange || ""}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., +10 or -5"
              />
              <p className="text-muted-foreground mt-[4px]">
                New quantity: {item.quantity + (adjustForm.quantityChange || 0)} {item.unit}
              </p>
            </div>
            <div>
              <Label htmlFor="adjust-reason">Reason for Adjustment *</Label>
              <Textarea
                id="adjust-reason"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Required: Explain why this adjustment is needed..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="adjust-reference">Reference</Label>
              <Input
                id="adjust-reference"
                value={adjustForm.reference}
                onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjust} 
              disabled={adjustForm.quantityChange === 0 || !adjustForm.reason.trim()}
            >
              Adjust Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
