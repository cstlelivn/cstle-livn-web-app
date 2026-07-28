import { useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import { createPurchaseTransactions, type PurchaseLineItem } from "../src/features/purchases/api";

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhases: string[];
  onSuccess?: () => void;
}

interface LineItem extends PurchaseLineItem {
  id: string; // Local UI id
  inventory_name?: string; // For display
  inventory_unit?: string; // For display
}

export default function AddPurchaseDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectPhases,
  onSuccess,
}: AddPurchaseDialogProps) {
  const { inventory, vendors } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vendorId, setVendorId] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      inventory_id: "",
      phase_name: "",
      quantity: 0,
      unit_cost: 0,
      notes: "",
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form
  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setVendorId("");
    setLineItems([
      {
        id: crypto.randomUUID(),
        inventory_id: "",
        phase_name: "",
        quantity: 0,
        unit_cost: 0,
        notes: "",
      },
    ]);
  };

  // Add a new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        inventory_id: "",
        phase_name: "",
        quantity: 0,
        unit_cost: 0,
        notes: "",
      },
    ]);
  };

  // Remove a line item
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error("Must have at least one line item");
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update a line item
  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If inventory_id changes, update display fields
          if (field === "inventory_id") {
            const invItem = inventory.find((inv) => inv.id === value);
            if (invItem) {
              updated.inventory_name = invItem.name;
              updated.inventory_unit = invItem.unit;
              // Pre-fill unit cost if available
              if (invItem.cost && updated.unit_cost === 0) {
                updated.unit_cost = invItem.cost;
              }
            }
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Calculate total for a line item
  const calculateLineTotal = (item: LineItem): number => {
    return item.quantity * item.unit_cost;
  };

  // Calculate grand total
  const calculateGrandTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  // Validate and save
  const handleSave = async () => {
    // Validation
    if (!projectId) {
      toast.error("Project ID is required");
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.inventory_id && item.phase_name && item.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error("Add at least one valid line item with inventory, phase, and quantity > 0");
      return;
    }

    // Check for items without unit cost
    const itemsWithoutCost = validItems.filter((item) => item.unit_cost === 0);
    if (itemsWithoutCost.length > 0) {
      const confirm = window.confirm(
        `${itemsWithoutCost.length} item(s) have $0 unit cost. Continue?`
      );
      if (!confirm) return;
    }

    setIsSaving(true);

    try {
      // Convert to API format (remove UI-only fields)
      const apiItems: PurchaseLineItem[] = validItems.map((item) => ({
        inventory_id: item.inventory_id,
        phase_name: item.phase_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        notes: item.notes || undefined,
      }));

      await createPurchaseTransactions({
        project_id: projectId,
        vendor_id: vendorId || undefined,
        date: date,
        items: apiItems,
      });

      toast.success(`Purchase recorded: ${validItems.length} item(s), $${calculateGrandTotal().toFixed(2)} total`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating purchase:", error);
      toast.error(`Failed to record purchase: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-family-heading)",
              fontSize: "var(--text-h2)",
              fontWeight: "var(--font-weight-extrabold)",
              fontVariationSettings: "'wdth' 137",
            }}
          >
            <ShoppingCart className="inline-block w-5 h-5 mr-2 mb-1" />
            Add Project Purchase
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Record material purchases for {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[16px] py-[16px]">
          {/* Project Info (Read-only) */}
          <div className="bg-card p-[12px] rounded-[8px] border border-border">
            <div
              style={{
                fontFamily: "var(--font-family-heading)",
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-bold)",
                fontVariationSettings: "'wdth' 137",
                color: "var(--muted-foreground)",
                marginBottom: "4px",
              }}
            >
              PROJECT
            </div>
            <div
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              {projectName}
            </div>
          </div>

          {/* Date and Vendor */}
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
                Purchase Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                  backgroundColor: "var(--input-background)",
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
                Vendor (Optional)
              </Label>
              <Select value={vendorId || "none"} onValueChange={(value) => setVendorId(value === "none" ? "" : value)}>
                <SelectTrigger
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                    backgroundColor: "var(--input-background)",
                  }}
                >
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-[8px]">
              <Label
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                  fontSize: "var(--text-label)",
                }}
              >
                ITEMS
              </Label>
              <Button
                onClick={addLineItem}
                variant="outline"
                size="sm"
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-label)",
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="border border-border rounded-[8px] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Material</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Phase</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Qty</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Unit</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Unit Cost</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Total</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)" }}>Notes</TableHead>
                    <TableHead style={{ fontSize: "var(--text-label)", width: "50px" }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      {/* Material */}
                      <TableCell>
                        <Select
                          value={item.inventory_id}
                          onValueChange={(value) => updateLineItem(item.id, "inventory_id", value)}
                        >
                          <SelectTrigger
                            className="h-[32px]"
                            style={{
                              fontFamily: "var(--font-family-body)",
                              fontSize: "var(--text-small)",
                            }}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id.toString()}>
                                {inv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Phase */}
                      <TableCell>
                        <Select
                          value={item.phase_name}
                          onValueChange={(value) => updateLineItem(item.id, "phase_name", value)}
                        >
                          <SelectTrigger
                            className="h-[32px]"
                            style={{
                              fontFamily: "var(--font-family-body)",
                              fontSize: "var(--text-small)",
                            }}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projectPhases.map((phase) => (
                              <SelectItem key={phase} value={phase}>
                                {phase}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="h-[32px] w-[80px]"
                          style={{
                            fontFamily: "var(--font-family-body)",
                            fontSize: "var(--text-small)",
                          }}
                        />
                      </TableCell>

                      {/* Unit (display only) */}
                      <TableCell
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-small)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {item.inventory_unit || "—"}
                      </TableCell>

                      {/* Unit Cost */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, "unit_cost", parseFloat(e.target.value) || 0)
                          }
                          className="h-[32px] w-[100px]"
                          style={{
                            fontFamily: "var(--font-family-body)",
                            fontSize: "var(--text-small)",
                          }}
                        />
                      </TableCell>

                      {/* Total */}
                      <TableCell
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-small)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        ${calculateLineTotal(item).toFixed(2)}
                      </TableCell>

                      {/* Notes */}
                      <TableCell>
                        <Input
                          value={item.notes || ""}
                          onChange={(e) => updateLineItem(item.id, "notes", e.target.value)}
                          placeholder="Optional"
                          className="h-[32px]"
                          style={{
                            fontFamily: "var(--font-family-body)",
                            fontSize: "var(--text-small)",
                          }}
                        />
                      </TableCell>

                      {/* Delete */}
                      <TableCell>
                        <Button
                          onClick={() => removeLineItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="h-[28px] px-[6px] text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-end mt-[12px] p-[12px] bg-accent/10 rounded-[8px] border border-accent">
              <span
                style={{
                  fontFamily: "var(--font-family-heading)",
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-bold)",
                  fontVariationSettings: "'wdth' 137",
                  marginRight: "12px",
                }}
              >
                TOTAL:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-h3)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--accent)",
                }}
              >
                ${calculateGrandTotal().toFixed(2)}
              </span>
            </div>
          </div>
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
            {isSaving ? "Saving..." : "Save Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
