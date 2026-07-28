import { useState, useEffect } from "react";
import { Edit2, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { updateProjectTransaction, type ProjectTransaction, type TransactionType } from "../src/features/transactions/projectTransactionsApi";

interface EditProjectTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ProjectTransaction | null;
  projectPhases: string[];
  onSuccess?: () => void;
}

export default function EditProjectTransactionDialog({
  open,
  onOpenChange,
  transaction,
  projectPhases,
  onSuccess,
}: EditProjectTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>("purchase");
  const [vendorOrRecipient, setVendorOrRecipient] = useState("");
  const [itemOrDescription, setItemOrDescription] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load transaction data when dialog opens
  useEffect(() => {
    if (transaction && open) {
      setTransactionType(transaction.transactionType);
      setVendorOrRecipient(transaction.vendorOrRecipient);
      setItemOrDescription(transaction.itemOrDescription);
      setPhaseName(transaction.phaseName || "");
      setQuantity(transaction.quantity || 1);
      setUnitCost(transaction.unitCost || 0);
      setTotalCost(transaction.totalCost);
      setTransactionDate(transaction.transactionDate);
      setNotes(transaction.notes || "");
    }
  }, [transaction, open]);

  // Calculate total cost for purchases
  const calculatedTotalCost = transactionType === "purchase" ? quantity * unitCost : totalCost;

  const handleSave = async () => {
    if (!transaction) return;

    // Validation
    if (!vendorOrRecipient.trim()) {
      toast.error(transactionType === "purchase" ? "Vendor name is required" : "Recipient name is required");
      return;
    }
    if (!itemOrDescription.trim()) {
      toast.error(transactionType === "purchase" ? "Item name is required" : "Description is required");
      return;
    }

    if (transactionType === "purchase") {
      if (quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
      if (unitCost < 0) {
        toast.error("Unit cost cannot be negative");
        return;
      }
    } else if (transactionType === "payment") {
      if (totalCost <= 0) {
        toast.error("Total cost must be greater than 0");
        return;
      }
    }

    setIsSaving(true);

    try {
      const updates: any = {
        transactionType,
        vendorOrRecipient: vendorOrRecipient.trim(),
        itemOrDescription: itemOrDescription.trim(),
        phaseName: phaseName || undefined,
        transactionDate,
        notes: notes.trim() || undefined,
      };

      if (transactionType === "purchase") {
        updates.quantity = quantity;
        updates.unitCost = unitCost;
      } else {
        updates.totalCost = totalCost;
      }

      await updateProjectTransaction(transaction.id, updates);

      const typeLabel = transactionType === "purchase" ? "Purchase" : "Payment";
      toast.success(`${typeLabel} updated: ${itemOrDescription}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast.error(`Failed to update transaction: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-family-heading)",
              fontSize: "var(--text-h2)",
              fontWeight: "var(--font-weight-extrabold)",
              fontVariationSettings: "'wdth' 137",
            }}
          >
            <Edit2 className="inline-block w-5 h-5 mr-2 mb-1" />
            Edit Transaction
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Update transaction details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[20px] py-[16px]">
          {/* Transaction Type Badge */}
          <div>
            <Badge 
              variant={transactionType === "purchase" ? "default" : "secondary"}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-small)",
                textTransform: "capitalize",
              }}
            >
              {transactionType}
            </Badge>
          </div>

          {/* Vendor/Recipient */}
          <div>
            <Label
              style={{
                fontFamily: "var(--font-family-heading)",
                fontWeight: "var(--font-weight-bold)",
                fontVariationSettings: "'wdth' 137",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              {transactionType === "purchase" ? "Vendor / Store Name *" : "Recipient / Payee *"}
            </Label>
            <Input
              value={vendorOrRecipient}
              onChange={(e) => setVendorOrRecipient(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Item/Description */}
          <div>
            <Label
              style={{
                fontFamily: "var(--font-family-heading)",
                fontWeight: "var(--font-weight-bold)",
                fontVariationSettings: "'wdth' 137",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              {transactionType === "purchase" ? "Item Name *" : "Description *"}
            </Label>
            <Input
              value={itemOrDescription}
              onChange={(e) => setItemOrDescription(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Phase and Date */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <Label
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                  fontSize: "var(--text-label)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Phase (Optional)
              </Label>
              <Select value={phaseName} onValueChange={setPhaseName}>
                <SelectTrigger
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                  }}
                >
                  <SelectValue placeholder="No phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Phase</SelectItem>
                  {projectPhases.map((phase) => (
                    <SelectItem key={phase} value={phase}>
                      {phase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                  fontSize: "var(--text-label)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Transaction Date
              </Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              />
            </div>
          </div>

          {/* Purchase-specific: Quantity and Unit Cost */}
          {transactionType === "purchase" && (
            <div className="grid grid-cols-3 gap-[16px]">
              <div>
                <Label
                  style={{
                    fontFamily: "var(--font-family-heading)",
                    fontWeight: "var(--font-weight-bold)",
                    fontVariationSettings: "'wdth' 137",
                    fontSize: "var(--text-label)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Quantity *
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                  }}
                />
              </div>

              <div>
                <Label
                  style={{
                    fontFamily: "var(--font-family-heading)",
                    fontWeight: "var(--font-weight-bold)",
                    fontVariationSettings: "'wdth' 137",
                    fontSize: "var(--text-label)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Unit Cost
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                  }}
                />
              </div>

              <div>
                <Label
                  style={{
                    fontFamily: "var(--font-family-heading)",
                    fontWeight: "var(--font-weight-bold)",
                    fontVariationSettings: "'wdth' 137",
                    fontSize: "var(--text-label)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Total Cost
                </Label>
                <div
                  className="h-[40px] px-[12px] flex items-center bg-accent/10 border border-accent rounded-[6px]"
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--accent)",
                  }}
                >
                  ${calculatedTotalCost.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Payment-specific: Total Cost */}
          {transactionType === "payment" && (
            <div>
              <Label
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                  fontSize: "var(--text-label)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Total Cost *
              </Label>
              <div className="relative">
                <DollarSign
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  style={{ width: "16px", height: "16px" }}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                  className="pl-[36px]"
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label
              style={{
                fontFamily: "var(--font-family-heading)",
                fontWeight: "var(--font-weight-bold)",
                fontVariationSettings: "'wdth' 137",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Notes (Optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Show inventory link if exists */}
          {transaction.inventoryId && (
            <div className="p-[12px] bg-accent/10 border border-accent rounded-[8px]">
              <p
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-small)",
                  color: "var(--accent)",
                }}
              >
                ✓ This purchase is linked to inventory
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={isSaving}
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            {isSaving ? "Saving..." : "Update Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
