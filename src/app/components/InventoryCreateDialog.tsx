import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useApp } from "./AppContext";

// Default unit options
const DEFAULT_UNITS = ["Pcs", "Feet", "Inches", "Meters", "Yards", "Row", "Box", "Pack", "Sheet", "Roll", "Bag", "Can", "Bottle", "Kg", "Litre"];

// Trade-based categories
const TRADE_CATEGORIES = ["Flooring", "Painting", "Drywall", "Electrical", "Plumbing", "Finishing", "Carpentry", "Roofing", "Framing", "Tiling", "HVAC", "General"];

interface InventoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function InventoryCreateDialog({ open, onOpenChange, onSuccess }: InventoryCreateDialogProps) {
  const { addInventoryItem, vendors } = useApp();
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
    quantity: 0,
    unit: "",
    customUnit: "",
    showCustomUnitInput: false,
    minStock: 0,
    cost: 0,
    supplier: 0,
    assignedTo: "",
    lastRestocked: new Date().toISOString().split('T')[0],
  });

  const handleUnitChange = (value: string) => {
    setFormData({ 
      ...formData, 
      unit: value,
      showCustomUnitInput: value === "Other",
      customUnit: value === "Other" ? formData.customUnit : ""
    });
  };

  const handleCreate = async () => {
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

    if (formData.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
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

    if (!finalUnit) {
      toast.error("Please select a unit");
      return;
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
      
      await addInventoryItem({
        name: formData.name.trim(),
        type: formData.type as "Equipment" | "Consumable",
        category: formData.category,
        location: formData.location.trim() || undefined,
        quantity: formData.quantity,
        unit: finalUnit,
        minStock: formData.minStock,
        cost: formData.cost,
        supplier: formData.supplier || 0,
        assignedTo: formData.assignedTo.trim() || undefined,
        lastRestocked: formData.lastRestocked || undefined,
      });

      toast.success("Inventory item created successfully");
      
      // Reset form
      setFormData({
        name: "",
        type: "",
        category: "",
        location: "",
        quantity: 0,
        unit: "",
        customUnit: "",
        showCustomUnitInput: false,
        minStock: 0,
        cost: 0,
        supplier: 0,
        assignedTo: "",
        lastRestocked: new Date().toISOString().split('T')[0],
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to create item: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new tool or material to your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[16px] py-[16px]">
          {/* Item Name */}
          <div>
            <Label htmlFor="create-name">Item Name *</Label>
            <Input
              id="create-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Paint - Interior White"
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <Label htmlFor="create-type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="create-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="create-category">
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
            <Label htmlFor="create-location">Location</Label>
            <Input
              id="create-location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Warehouse A, Shelf 3"
            />
          </div>

          {/* Quantity, Unit, Reorder Level */}
          <div className="grid grid-cols-3 gap-[16px]">
            <div>
              <Label htmlFor="create-quantity">Quantity *</Label>
              <Input
                id="create-quantity"
                type="number"
                min="1"
                value={formData.quantity || ""}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="create-unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={handleUnitChange}>
                <SelectTrigger id="create-unit">
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

            <div>
              <Label htmlFor="create-minStock">Reorder Level *</Label>
              <Input
                id="create-minStock"
                type="number"
                min="0"
                value={formData.minStock || ""}
                onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Cost and Supplier */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <Label htmlFor="create-cost">Unit Cost ($) *</Label>
              <Input
                id="create-cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost || ""}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="create-supplier">Supplier</Label>
              <Select 
                value={formData.supplier.toString()} 
                onValueChange={(value) => setFormData({ ...formData, supplier: parseInt(value) || 0 })}
              >
                <SelectTrigger id="create-supplier">
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
          </div>

          {/* Assigned To (for Equipment) */}
          {formData.type === "Equipment" && (
            <div>
              <Label htmlFor="create-assignedTo">Assigned To</Label>
              <Input
                id="create-assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="Team member name"
              />
            </div>
          )}

          {/* Last Restocked */}
          <div>
            <Label htmlFor="create-lastRestocked">Last Restocked</Label>
            <Input
              id="create-lastRestocked"
              type="date"
              value={formData.lastRestocked}
              onChange={(e) => setFormData({ ...formData, lastRestocked: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
