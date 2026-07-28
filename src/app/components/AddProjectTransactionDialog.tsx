import { useState } from "react";
import { Receipt, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { createProjectTransaction, type CreateProjectTransactionInput, type TransactionType } from "../src/features/transactions/projectTransactionsApi";

interface AddProjectTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhases: string[];
  onSuccess?: () => void;
}

export default function AddProjectTransactionDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectPhases,
  onSuccess,
}: AddProjectTransactionDialogProps) {
  // Transaction type
  const [transactionType, setTransactionType] = useState<TransactionType>("purchase");
  
  // Common fields
  const [vendorOrRecipient, setVendorOrRecipient] = useState("");
  const [itemOrDescription, setItemOrDescription] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Purchase-specific fields
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [linkToInventory, setLinkToInventory] = useState(false);
  const [inventoryType, setInventoryType] = useState<string>("Material");
  const [inventoryLocation, setInventoryLocation] = useState("");
  const [inventoryReorderLevel, setInventoryReorderLevel] = useState<number>(0);
  const [inventoryUnit, setInventoryUnit] = useState("");

  // Payment-specific fields
  const [totalCost, setTotalCost] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);

  // Calculate total cost for purchases
  const calculatedTotalCost = transactionType === "purchase" ? quantity * unitCost : totalCost;

  // Reset form
  const resetForm = () => {
    setTransactionType("purchase");
    setVendorOrRecipient("");
    setItemOrDescription("");
    setPhaseName("");
    setQuantity(1);
    setUnitCost(0);
    setTotalCost(0);
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setLinkToInventory(false);
    setInventoryType("Material");
    setInventoryLocation("");
    setInventoryReorderLevel(0);
    setInventoryUnit("");
  };

  // Validate and save
  const handleSave = async () => {
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
      if (linkToInventory && !inventoryLocation.trim()) {
        toast.error("Inventory location is required when linking to inventory");
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
      const input: CreateProjectTransactionInput = {
        projectId,
        transactionType,
        phaseName: phaseName && phaseName !== "__none__" ? phaseName : undefined,
        vendorOrRecipient: vendorOrRecipient.trim(),
        itemOrDescription: itemOrDescription.trim(),
        date: transactionDate, // Changed from transactionDate to date
        notes: notes.trim() || undefined,
      };

      // Add purchase-specific fields
      if (transactionType === "purchase") {
        input.quantity = quantity;
        input.unitCost = unitCost;
        input.linkToInventory = linkToInventory;
        if (linkToInventory) {
          input.inventoryType = inventoryType;
          input.inventoryLocation = inventoryLocation.trim();
          input.inventoryReorderLevel = inventoryReorderLevel;
          input.inventoryUnit = inventoryUnit.trim();
        }
      } else {
        // Add payment-specific fields
        input.amount = totalCost; // Changed from totalCost to amount
      }

      await createProjectTransaction(input);

      const typeLabel = transactionType === "purchase" ? "Purchase" : "Payment";
      toast.success(
        `${typeLabel} recorded: ${itemOrDescription} - $${calculatedTotalCost.toFixed(2)}${
          transactionType === "purchase" && linkToInventory ? " (added to inventory)" : ""
        }`
      );
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error(`Failed to record transaction: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
            <Receipt className="inline-block w-5 h-5 mr-2 mb-1" />
            Add Project Transaction
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Record a transaction for {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[20px] py-[16px]">
          {/* Transaction Type */}
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
              Transaction Type *
            </Label>
            <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
              <SelectTrigger
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
            <p
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-small)",
                color: "var(--muted-foreground)",
                marginTop: "4px",
              }}
            >
              {transactionType === "purchase"
                ? "For tools, materials, supplies, or inventory items"
                : "For labour, subcontractors, reimbursements, or other expenses"}
            </p>
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
              placeholder={
                transactionType === "purchase"
                  ? "e.g., Rona Rochdale, Home Depot East"
                  : "e.g., John the Painter, ABC Subcontractors"
              }
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
              placeholder={
                transactionType === "purchase"
                  ? "e.g., 2x4 Lumber, Paint Gallon, Door Handle"
                  : "e.g., Labour 3 hrs, Transport reimbursement, Subcontractor fee"
              }
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
                  <SelectValue placeholder="Select phase..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Phase</SelectItem>
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
                  placeholder="0.00"
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
              placeholder="Add any additional details..."
              rows={3}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Link to Inventory Toggle (Purchase only) */}
          {transactionType === "purchase" && (
            <div className="border border-border rounded-[8px] p-[16px] bg-card">
              <div className="flex items-center justify-between mb-[16px]">
                <div>
                  <Label
                    style={{
                      fontFamily: "var(--font-family-heading)",
                      fontWeight: "var(--font-weight-bold)",
                      fontVariationSettings: "'wdth' 137",
                      fontSize: "var(--text-label)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Link to Inventory?
                  </Label>
                  <p
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Create an inventory item from this purchase
                  </p>
                </div>
                <Switch checked={linkToInventory} onCheckedChange={setLinkToInventory} />
              </div>

              {linkToInventory && (
                <div className="space-y-[16px] pt-[16px] border-t border-border">
                  {/* Inventory Type */}
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
                        Inventory Type *
                      </Label>
                      <Select value={inventoryType} onValueChange={setInventoryType}>
                        <SelectTrigger
                          style={{
                            fontFamily: "var(--font-family-body)",
                            fontSize: "var(--text-base)",
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tool">Tool</SelectItem>
                          <SelectItem value="Material">Material</SelectItem>
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
                        Unit (Optional)
                      </Label>
                      <Input
                        value={inventoryUnit}
                        onChange={(e) => setInventoryUnit(e.target.value)}
                        placeholder="e.g., pcs, lbs, ft"
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-base)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Inventory Location */}
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
                      Inventory Location *
                    </Label>
                    <Input
                      value={inventoryLocation}
                      onChange={(e) => setInventoryLocation(e.target.value)}
                      placeholder="e.g., Warehouse A, Truck #2, Main Storage"
                      style={{
                        fontFamily: "var(--font-family-body)",
                        fontSize: "var(--text-base)",
                      }}
                    />
                  </div>

                  {/* Reorder Level */}
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
                      Reorder Level (Optional)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={inventoryReorderLevel}
                      onChange={(e) => setInventoryReorderLevel(parseFloat(e.target.value) || 0)}
                      placeholder="Minimum stock level"
                      style={{
                        fontFamily: "var(--font-family-body)",
                        fontSize: "var(--text-base)",
                      }}
                    />
                  </div>
                </div>
              )}
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
            {isSaving ? "Saving..." : `Save ${transactionType === "purchase" ? "Purchase" : "Payment"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}