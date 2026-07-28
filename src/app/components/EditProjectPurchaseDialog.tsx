import { useState, useEffect } from "react";
import { Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { updateProjectPurchase, type ProjectPurchase } from "../src/features/purchases/projectPurchasesApi";

interface EditProjectPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: ProjectPurchase | null;
  projectPhases: string[];
  onSuccess?: () => void;
}

export default function EditProjectPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  projectPhases,
  onSuccess,
}: EditProjectPurchaseDialogProps) {
  const [itemName, setItemName] = useState("");
  const [vendor, setVendor] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load purchase data when dialog opens
  useEffect(() => {
    if (purchase && open) {
      setItemName(purchase.itemName);
      setVendor(purchase.vendor);
      setPhaseName(purchase.phaseName);
      setQuantity(purchase.quantity);
      setUnitCost(purchase.unitCost);
      setPurchaseDate(purchase.purchaseDate);
      setNotes(purchase.notes || "");
    }
  }, [purchase, open]);

  // Calculate total cost
  const totalCost = quantity * unitCost;

  const handleSave = async () => {
    if (!purchase) return;

    // Validation
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!vendor.trim()) {
      toast.error("Vendor/Store name is required");
      return;
    }
    if (!phaseName) {
      toast.error("Please select a phase");
      return;
    }
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (unitCost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }

    setIsSaving(true);

    try {
      await updateProjectPurchase(purchase.id, {
        itemName: itemName.trim(),
        vendor: vendor.trim(),
        phaseName,
        quantity,
        unitCost,
        purchaseDate,
        notes: notes.trim() || undefined,
      });

      toast.success(`Purchase updated: ${itemName}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating purchase:", error);
      toast.error(`Failed to update purchase: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!purchase) return null;

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
            Edit Purchase
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Update purchase details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[20px] py-[16px]">
          {/* Item Name */}
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
              Item Name *
            </Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Vendor / Store Name */}
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
              Vendor / Store Name *
            </Label>
            <Input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Phase and Purchase Date */}
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
                Phase *
              </Label>
              <Select value={phaseName} onValueChange={setPhaseName}>
                <SelectTrigger
                  style={{
                    fontFamily: "var(--font-family-body)",
                    fontSize: "var(--text-base)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                Purchase Date
              </Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              />
            </div>
          </div>

          {/* Quantity and Unit Cost */}
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
                ${totalCost.toFixed(2)}
              </div>
            </div>
          </div>

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
          {purchase.inventoryId && (
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
            {isSaving ? "Saving..." : "Update Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
