import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { createProjectPurchase, type CreateProjectPurchaseInput } from "../src/features/purchases/projectPurchasesApi";

interface AddProjectPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectPhases: string[];
  onSuccess?: () => void;
}

export default function AddProjectPurchaseDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectPhases,
  onSuccess,
}: AddProjectPurchaseDialogProps) {
  // Basic purchase fields
  const [itemName, setItemName] = useState("");
  const [vendor, setVendor] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Inventory fields
  const [addToInventory, setAddToInventory] = useState(false);
  const [inventoryType, setInventoryType] = useState<string>("Material");
  const [inventoryLocation, setInventoryLocation] = useState("");
  const [inventoryReorderLevel, setInventoryReorderLevel] = useState<number>(0);
  const [inventoryUnit, setInventoryUnit] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Calculate total cost
  const totalCost = quantity * unitCost;

  // Reset form
  const resetForm = () => {
    setItemName("");
    setVendor("");
    setPhaseName("");
    setQuantity(1);
    setUnitCost(0);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setAddToInventory(false);
    setInventoryType("Material");
    setInventoryLocation("");
    setInventoryReorderLevel(0);
    setInventoryUnit("");
  };

  // Validate and save
  const handleSave = async () => {
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
    if (addToInventory && !inventoryLocation.trim()) {
      toast.error("Inventory location is required when adding to inventory");
      return;
    }

    setIsSaving(true);

    try {
      const input: CreateProjectPurchaseInput = {
        projectId,
        phaseName,
        itemName: itemName.trim(),
        vendor: vendor.trim(),
        quantity,
        unitCost,
        purchaseDate,
        notes: notes.trim() || undefined,
        addToInventory,
        inventoryType: addToInventory ? inventoryType : undefined,
        inventoryLocation: addToInventory ? inventoryLocation.trim() : undefined,
        inventoryReorderLevel: addToInventory ? inventoryReorderLevel : undefined,
        inventoryUnit: addToInventory ? inventoryUnit.trim() : undefined,
      };

      await createProjectPurchase(input);

      toast.success(
        `Purchase recorded: ${itemName} - $${totalCost.toFixed(2)}${
          addToInventory ? " (added to inventory)" : ""
        }`
      );
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
            <ShoppingCart className="inline-block w-5 h-5 mr-2 mb-1" />
            Add Project Purchase
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
            }}
          >
            Record a purchase for {projectName}
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
              placeholder="e.g., 2x4 Lumber, Paint Gallon, Door Handle"
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
              placeholder="e.g., Rona Rochdale, Home Depot East"
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
                  <SelectValue placeholder="Select phase..." />
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
              placeholder="Add any additional details..."
              rows={3}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Add to Inventory Toggle */}
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
                  Add to Inventory?
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
              <Switch checked={addToInventory} onCheckedChange={setAddToInventory} />
            </div>

            {addToInventory && (
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
