import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { getInventoryItem } from "../src/features/inventory/api";
import { useApp } from "./AppContext";

// Default unit options
const DEFAULT_UNITS = ["Pcs", "Feet", "Inches", "Meters", "Yards", "Row", "Box", "Pack", "Sheet", "Roll", "Bag", "Can", "Bottle", "Kg", "Litre"];

// Trade-based categories
const TRADE_CATEGORIES = ["Flooring", "Painting", "Drywall", "Electrical", "Plumbing", "Finishing", "Carpentry", "Roofing", "Framing", "Tiling", "HVAC", "General"];

interface InventoryEditDialogProps {
  inventoryId: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function InventoryEditDialog({ inventoryId, open, onOpenChange, onSuccess }: InventoryEditDialogProps) {
  const { updateInventoryItem, vendors } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load custom units from localStorage
  const [customUnits, setCustomUnits] = useState<string[]>(() => {
    const stored = localStorage.getItem("cstle_custom_units");
    return stored ? JSON.parse(stored) : [];
  });

  const allUnits = [...DEFAULT_UNITS, ...customUnits, "Other"];

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    category: "",
    location: "",
    unit: "",
    customUnit: "",
    showCustomUnitInput: false,
    minStock: 0,
    cost: 0,
    supplier: 0,
    assignedTo: "",
    lastRestocked: "",
  });

  // Load item data when dialog opens
  useEffect(() => {
    if (open && inventoryId) {
      loadItemData();
    }
  }, [open, inventoryId]);

  const loadItemData = async () => {
    if (!inventoryId) return;

    try {
      setIsLoading(true);
      const item = await getInventoryItem(inventoryId as string);
      
      if (item) {
        // Check if unit is a custom unit
        const isCustomUnit = !DEFAULT_UNITS.includes(item.unit) && item.unit !== "Other";
        
        setFormData({
          name: item.name || "",
          type: item.type || "",
          category: item.category || "",
          location: item.location || "",
          unit: isCustomUnit ? "Other" : item.unit || "",
          customUnit: isCustomUnit ? item.unit : "",
          showCustomUnitInput: isCustomUnit,
          minStock: item.minStock || 0,
          cost: item.cost || 0,
          supplier: item.supplier || 0,
          assignedTo: item.assignedTo || "",
          lastRestocked: item.lastRestocked ? item.lastRestocked.split('T')[0] : "",
        });
      }
    } catch (error: any) {
      toast.error(`Failed to load item: ${error.message}`);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitChange = (value: string) => {
    setFormData({ 
      ...formData, 
      unit: value,
      showCustomUnitInput: value === "Other",
      customUnit: value === "Other" ? formData.customUnit : ""
    });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    if (!formData.type) {
      toast.error("Type is required");
      return;
    }

    if (!formData.category) {
      toast.error("Category is required");
      return;
    }

    // Handle custom unit
    let finalUnit = formData.unit;
    if (formData.unit === "Other") {
      if (!formData.customUnit.trim()) {
        toast.error("Please enter a custom unit");
        return;
      }
      finalUnit = formData.customUnit.trim();
      
      // Save custom unit to localStorage if it's new
      if (!customUnits.includes(finalUnit)) {
        const updatedUnits = [...customUnits, finalUnit];
        setCustomUnits(updatedUnits);
        localStorage.setItem("cstle_custom_units", JSON.stringify(updatedUnits));
      }
    }

    if (formData.cost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }

    if (formData.minStock < 0) {
      toast.error("Reorder level cannot be negative");
      return;
    }

    try {
      setIsSaving(true);
      
      await updateInventoryItem(inventoryId as number, {
        name: formData.name.trim(),
        type: formData.type as "Equipment" | "Consumable",
        category: formData.category,
        location: formData.location.trim() || undefined,
        unit: finalUnit,
        minStock: formData.minStock,
        cost: formData.cost,
        supplier: formData.supplier || 0,
        assignedTo: formData.assignedTo.trim() || undefined,
        lastRestocked: formData.lastRestocked || undefined,
      });

      toast.success("Inventory item updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update item details below. Note: To change quantity, use stock movement actions.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-[32px] text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-[16px] py-[16px]">
            {/* Item Name */}
            <div>
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Paint - Interior White"
              />
            </div>

            {/* Type and Category */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Consumable">Consumable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="edit-unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={handleUnitChange}>
                <SelectTrigger id="edit-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {allUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.showCustomUnitInput && (
                <Input
                  value={formData.customUnit}
                  onChange={(e) => setFormData({ ...formData, customUnit: e.target.value })}
                  placeholder="Enter custom unit"
                  className="mt-[8px]"
                />
              )}
            </div>

            {/* Reorder Level and Cost */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label htmlFor="edit-minStock">Reorder Level *</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="edit-cost">Unit Cost ($) *</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <Label htmlFor="edit-supplier">Supplier</Label>
              <Select 
                value={formData.supplier.toString()} 
                onValueChange={(value) => setFormData({ ...formData, supplier: parseInt(value) || 0 })}
              >
                <SelectTrigger id="edit-supplier">
                  <SelectValue placeholder="Select supplier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No supplier</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To (for Equipment) */}
            {formData.type === "Equipment" && (
              <div>
                <Label htmlFor="edit-assignedTo">Assigned To</Label>
                <Input
                  id="edit-assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Team member name"
                />
              </div>
            )}

            {/* Last Restocked */}
            <div>
              <Label htmlFor="edit-lastRestocked">Last Restocked</Label>
              <Input
                id="edit-lastRestocked"
                type="date"
                value={formData.lastRestocked}
                onChange={(e) => setFormData({ ...formData, lastRestocked: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
