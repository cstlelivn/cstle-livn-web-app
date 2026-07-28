import { useState, useEffect } from "react";
import { Plus, AlertCircle, Package, TrendingDown, Search, Download, ArrowUpDown, Wrench, Box, Edit2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { createPurchaseTransactions } from "../src/features/purchases/api";
import { getInventoryProjectLink, updateInventoryProjectLink } from "../src/features/inventory/linkingApi";

// Default unit options
const DEFAULT_UNITS = [
  "Pcs", 
  "Feet", 
  "Inches", 
  "Meters", 
  "Yards", 
  "Row", 
  "Box", 
  "Pack", 
  "Sheet", 
  "Roll", 
  "Bag", 
  "Can", 
  "Bottle", 
  "Gallon", 
  "Quart", 
  "Pint", 
  "Kg", 
  "Litre", 
  "Lbs", 
  "Sq Ft", 
  "Sq Yd", 
  "Linear Ft", 
  "Bundle", 
  "Pallet", 
  "Tube", 
  "Bucket"
];

// Trade-based categories
const TRADE_CATEGORIES = ["Flooring", "Painting", "Drywall", "Electrical", "Plumbing", "Finishing", "Carpentry", "Roofing", "Framing", "Tiling", "HVAC", "General"];

export default function InventoryModule() {
  const { inventory, isLoadingInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, vendors, projects } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
  });

  // Load custom units from localStorage
  const [customUnits, setCustomUnits] = useState<string[]>(() => {
    const stored = localStorage.getItem("cstle_custom_units");
    return stored ? JSON.parse(stored) : [];
  });

  // Track project links for inventory items
  const [inventoryProjectLinks, setInventoryProjectLinks] = useState<Record<string, { projectId: string; phaseName: string }>>({});

  // Load project links for all inventory items
  useEffect(() => {
    const loadProjectLinks = async () => {
      if (!inventory || inventory.length === 0) return;
      
      const links: Record<string, { projectId: string; phaseName: string }> = {};
      
      for (const item of inventory) {
        const link = await getInventoryProjectLink(item.id);
        if (link && link.projectId && link.phaseName) {
          links[item.id] = {
            projectId: link.projectId,
            phaseName: link.phaseName,
          };
        }
      }
      
      setInventoryProjectLinks(links);
    };
    
    loadProjectLinks();
  }, [inventory]);

  // Debug: Log projects when they change
  useEffect(() => {
    console.log("InventoryModule - Projects available:", projects?.length || 0);
    if (projects && projects.length > 0) {
      console.log("InventoryModule - First few projects:", projects.slice(0, 3).map(p => ({ id: p.id, title: p.title })));
    }
  }, [projects]);

  // All available units (default + custom)
  const allUnits = [...DEFAULT_UNITS, ...customUnits, "Other"];

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    category: "",
    quantity: 0,
    unit: "",
    customUnit: "",
    showCustomUnitInput: false,
    minStock: 0,
    cost: 0,
    supplier: 0,
    location: "",
    assignedTo: "",
    lastRestocked: "",
    linkedProjectId: "",
    linkedPhase: "",
  });

  // Form state for creating new items
  const [newItem, setNewItem] = useState({
    name: "",
    type: "",
    category: "",
    quantity: 0,
    unit: "",
    customUnit: "",
    showCustomUnitInput: false,
    minStock: 0,
    cost: 0,
    supplier: 0,
    location: "",
    assignedTo: "",
    lastRestocked: new Date().toISOString().split('T')[0],
    linkedProjectId: "",
    linkedPhase: "",
  });

  // Check if form is valid
  const isFormValid = () => {
    const hasRequiredFields = 
      newItem.name.trim() !== "" &&
      newItem.type !== "" &&
      newItem.category !== "" &&
      newItem.quantity > 0 &&
      (newItem.unit !== "" && newItem.unit !== "Other") || (newItem.unit === "Other" && newItem.customUnit.trim() !== "") &&
      newItem.cost >= 0;
    
    return hasRequiredFields;
  };

  const handleCreateItem = async () => {
    // Final validation
    if (!newItem.name || !newItem.type || !newItem.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newItem.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (newItem.cost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }

    // Validate project link
    if (newItem.linkedProjectId && !newItem.linkedPhase) {
      toast.error("Please select a phase when linking to a project");
      return;
    }

    // Handle custom unit
    let finalUnit = newItem.unit;
    if (newItem.unit === "Other") {
      if (!newItem.customUnit.trim()) {
        toast.error("Please enter a custom unit");
        return;
      }
      finalUnit = newItem.customUnit.trim();
      
      // Save custom unit to localStorage if it's new
      if (!customUnits.includes(finalUnit) && !DEFAULT_UNITS.includes(finalUnit)) {
        const updatedCustomUnits = [...customUnits, finalUnit];
        setCustomUnits(updatedCustomUnits);
        localStorage.setItem("cstle_custom_units", JSON.stringify(updatedCustomUnits));
      }
    }

    if (!finalUnit) {
      toast.error("Please select a unit");
      return;
    }

    try {
      const isLinkedToProject = newItem.linkedProjectId && newItem.linkedPhase;
      
      // Create inventory item
      const createdItem = await addInventoryItem({
        name: newItem.name,
        type: newItem.type,
        category: newItem.category,
        quantity: newItem.quantity,
        unit: finalUnit,
        minStock: newItem.minStock,
        cost: newItem.cost,
        supplier: newItem.supplier,
        location: newItem.location,
        assignedTo: newItem.assignedTo || undefined,
        lastRestocked: newItem.lastRestocked,
      });

      // If linked to a project, create a purchase transaction
      if (isLinkedToProject && createdItem?.id) {
        try {
          await createPurchaseTransactions({
            project_id: newItem.linkedProjectId,
            vendor_id: newItem.supplier !== 0 ? newItem.supplier : undefined,
            date: newItem.lastRestocked || new Date().toISOString(),
            items: [
              {
                inventory_id: createdItem.id,
                phase_name: newItem.linkedPhase,
                quantity: newItem.quantity,
                unit_cost: newItem.cost,
                notes: `Inventory purchase: ${newItem.name}`,
              },
            ],
          });
          
          toast.success("Inventory item created and linked to project");
        } catch (purchaseError: any) {
          console.error("Failed to create purchase transaction:", purchaseError);
          toast.warning(`Item created but failed to link to project: ${purchaseError.message}`);
        }
      } else {
        toast.success("Inventory item created successfully");
      }
      
      setIsCreateDialogOpen(false);
      
      // Reset form
      setNewItem({
        name: "",
        type: "",
        category: "",
        quantity: 0,
        unit: "",
        customUnit: "",
        showCustomUnitInput: false,
        minStock: 0,
        cost: 0,
        supplier: 0,
        location: "",
        assignedTo: "",
        lastRestocked: new Date().toISOString().split('T')[0],
        linkedProjectId: "",
        linkedPhase: "",
      });
    } catch (error: any) {
      console.error("Failed to create inventory item:", error);
      toast.error(`Failed to create item: ${error.message}`);
    }
  };

  // Handle unit selection for new item
  const handleUnitChange = (value: string) => {
    setNewItem({ 
      ...newItem, 
      unit: value,
      showCustomUnitInput: value === "Other",
      customUnit: value === "Other" ? newItem.customUnit : ""
    });
  };

  // Handle unit selection for edit
  const handleEditUnitChange = (value: string) => {
    setEditForm({ 
      ...editForm, 
      unit: value,
      showCustomUnitInput: value === "Other",
      customUnit: value === "Other" ? editForm.customUnit : ""
    });
  };

  // Open edit dialog
  const handleEditClick = async (item: any) => {
    // Check if unit is custom
    const isCustomUnit = !DEFAULT_UNITS.includes(item.unit);
    
    // Load project link
    const link = inventoryProjectLinks[item.id] || { projectId: "", phaseName: "" };
    
    setSelectedItem(item);
    setEditForm({
      name: item.name || "",
      type: item.type || "",
      category: item.category || "",
      quantity: item.quantity || 0,
      unit: isCustomUnit ? "Other" : item.unit || "",
      customUnit: isCustomUnit ? item.unit : "",
      showCustomUnitInput: isCustomUnit,
      minStock: item.minStock || 0,
      cost: item.cost || 0,
      supplier: item.supplier || 0,
      location: item.location || "",
      assignedTo: item.assignedTo || "",
      lastRestocked: item.lastRestocked ? item.lastRestocked.split('T')[0] : "",
      linkedProjectId: link.projectId || "",
      linkedPhase: link.phaseName || "",
    });
    setIsEditDialogOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    // Validate project link
    if (editForm.linkedProjectId && !editForm.linkedPhase) {
      toast.error("Please select a phase when linking to a project");
      return;
    }

    // Handle custom unit
    let finalUnit = editForm.unit;
    if (editForm.unit === "Other") {
      if (!editForm.customUnit.trim()) {
        toast.error("Please enter a custom unit");
        return;
      }
      finalUnit = editForm.customUnit.trim();
      
      // Save to localStorage
      if (!customUnits.includes(finalUnit) && !DEFAULT_UNITS.includes(finalUnit)) {
        const updatedUnits = [...customUnits, finalUnit];
        setCustomUnits(updatedUnits);
        localStorage.setItem("cstle_custom_units", JSON.stringify(updatedUnits));
      }
    }

    try {
      // Update inventory item
      await updateInventoryItem(selectedItem.id, {
        name: editForm.name.trim(),
        type: editForm.type as "Equipment" | "Consumable",
        category: editForm.category,
        quantity: editForm.quantity,
        unit: finalUnit,
        minStock: editForm.minStock,
        cost: editForm.cost,
        supplier: editForm.supplier || 0,
        location: editForm.location.trim() || undefined,
        assignedTo: editForm.assignedTo.trim() || undefined,
        lastRestocked: editForm.lastRestocked || undefined,
      });

      // Update project link separately
      await updateInventoryProjectLink(
        selectedItem.id,
        editForm.linkedProjectId || null,
        editForm.linkedPhase || null,
        editForm.quantity,
        editForm.cost,
        editForm.supplier !== 0 ? editForm.supplier : undefined
      );
      
      // Reload project links
      const link = await getInventoryProjectLink(selectedItem.id);
      if (link && link.projectId && link.phaseName) {
        setInventoryProjectLinks(prev => ({
          ...prev,
          [selectedItem.id]: {
            projectId: link.projectId!,
            phaseName: link.phaseName!,
          },
        }));
      } else {
        setInventoryProjectLinks(prev => {
          const updated = { ...prev };
          delete updated[selectedItem.id];
          return updated;
        });
      }
      
      toast.success("Item updated successfully");
      setIsEditDialogOpen(false);
      setSelectedItem(null);
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      await deleteInventoryItem(selectedItem.id);
      toast.success("Item deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (error: any) {
      toast.error(`Failed to delete item: ${error.message}`);
    }
  };

  const filteredInventory = inventory
    .filter((item) => {
      const matchesSearch = !filters.search ||
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesCategory = !filters.selects?.category ||
        filters.selects.category === "all" ||
        item.category === filters.selects.category;
      
      // Calculate status on the fly if not set
      const itemStatus = item.status || (
        item.type === "Equipment" 
          ? (item.assignedTo ? "In Use" : "Available")
          : (item.quantity <= item.minStock * 0.3 ? "Critical" : 
             item.quantity <= item.minStock * 0.6 ? "Low Stock" : "In Stock")
      );
      
      const matchesStatus = !filters.selects?.status ||
        filters.selects.status === "all" ||
        itemStatus === filters.selects.status;
      
      const matchesType = !filters.selects?.type ||
        filters.selects.type === "all" ||
        item.type === filters.selects.type;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.name.localeCompare(b.name);
        case "quantity":
          return order * (a.quantity - b.quantity);
        case "unitCost":
          return order * (a.cost - b.cost);
        case "totalValue":
          return order * ((a.quantity * a.cost) - (b.quantity * b.cost));
        case "lastUsed":
          if (!a.lastUsed && !b.lastUsed) return 0;
          if (!a.lastUsed) return 1;
          if (!b.lastUsed) return -1;
          return order * (new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime());
        default:
          return 0;
      }
    });

  // Calculate status for items that don't have it set
  const itemsWithStatus = inventory.map(item => ({
    ...item,
    status: item.status || (
      item.type === "Equipment" 
        ? (item.assignedTo ? "In Use" : "Available")
        : (item.quantity <= item.minStock * 0.3 ? "Critical" : 
           item.quantity <= item.minStock * 0.6 ? "Low Stock" : "In Stock")
    )
  }));

  const lowStockItems = itemsWithStatus.filter(
    (item) => item.type === "Consumable" && (item.status === "Low Stock" || item.status === "Critical")
  );

  const tools = itemsWithStatus.filter(item => item.type === "Equipment");
  const materials = itemsWithStatus.filter(item => item.type === "Consumable");

  const getStatusBadge = (item: any) => {
    const status = item.status || (
      item.type === "Equipment" 
        ? (item.assignedTo ? "In Use" : "Available")
        : (item.quantity <= item.minStock * 0.3 ? "Critical" : 
           item.quantity <= item.minStock * 0.6 ? "Low Stock" : "In Stock")
    );
    
    if (item.type === "Equipment") {
      if (status === "In Use")
        return <Badge className="bg-accent/10 text-accent" style={{ fontSize: 'var(--text-small)' }}>In Use</Badge>;
      if (status === "Available")
        return <Badge className="bg-primary/10 text-primary" style={{ fontSize: 'var(--text-small)' }}>Available</Badge>;
      return <Badge variant="outline" style={{ fontSize: 'var(--text-small)' }}>{status}</Badge>;
    } else {
      if (status === "Critical")
        return <Badge className="bg-destructive text-destructive-foreground" style={{ fontSize: 'var(--text-small)' }}>Critical</Badge>;
      if (status === "Low Stock")
        return <Badge className="bg-warning/20 text-warning" style={{ fontSize: 'var(--text-small)', color: 'var(--warning)' }}>Low Stock</Badge>;
      return <Badge className="bg-success/10 text-success" style={{ fontSize: 'var(--text-small)', color: 'var(--success)' }}>In Stock</Badge>;
    }
  };

  const getStockPercentage = (item: any) => {
    if (item.type === "Equipment" || item.minStock === 0) return 100;
    return Math.min(100, (item.quantity / item.minStock) * 100);
  };

  const getStockColor = (percentage: number) => {
    if (percentage < 30) return "bg-destructive";
    if (percentage < 60) return "bg-warning";
    return "bg-success";
  };

  const totalValue = itemsWithStatus.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0
  );

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name, category, assigned to...",
    },
    {
      type: "select",
      field: "category",
      label: "Category",
      options: [
        { value: "Tools", label: "Tools" },
        { value: "Materials", label: "Materials" },
      ],
    },
    {
      type: "select",
      field: "type",
      label: "Type",
      options: [
        { value: "Equipment", label: "Equipment" },
        { value: "Consumable", label: "Consumable" },
      ],
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "In Stock", label: "In Stock" },
        { value: "Low Stock", label: "Low Stock" },
        { value: "Critical", label: "Critical" },
        { value: "Available", label: "Available" },
        { value: "In Use", label: "In Use" },
      ],
    },
  ];

  // Sort options
  const sortOptions: SortOption[] = [
    { field: "name", label: "Item Name" },
    { field: "quantity", label: "Quantity" },
    { field: "unitCost", label: "Unit Cost" },
    { field: "totalValue", label: "Total Value" },
    { field: "lastUsed", label: "Last Used" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-3" style={{ gap: 'var(--spacing-md, 12px)' }}>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle style={{ 
                  fontFamily: 'var(--font-family-heading)',
                  fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-extrabold)',
                  fontVariationSettings: "'wdth' 137"
                }}>
                  Add Inventory Item
                </DialogTitle>
                <DialogDescription>
                  Add a new tool or material to your inventory
                </DialogDescription>
              </DialogHeader>
              <div 
                className="space-y-4 mt-4" 
                style={{ 
                  padding: '16px',
                  backgroundColor: 'var(--card)',
                  borderRadius: 'var(--radius)'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Item Name <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Input 
                      placeholder="e.g., Brad Nailer 18GA" 
                      value={newItem.name} 
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Type <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Select value={newItem.type} onValueChange={(value) => setNewItem({ ...newItem, type: value })}>
                      <SelectTrigger style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment (Tools)</SelectItem>
                        <SelectItem value="Consumable">Material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Category <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                      <SelectTrigger style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Location
                    </Label>
                    <Input 
                      placeholder="e.g., Shop, Van A" 
                      value={newItem.location} 
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Quantity <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      min="1"
                      value={newItem.quantity || ""} 
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Unit <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Select value={newItem.unit} onValueChange={handleUnitChange}>
                      <SelectTrigger style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUnits.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newItem.showCustomUnitInput && (
                      <Input 
                        type="text" 
                        placeholder="Enter custom unit (e.g., Pair, Bundle)" 
                        value={newItem.customUnit} 
                        onChange={(e) => setNewItem({ ...newItem, customUnit: e.target.value })} 
                        className="mt-2"
                        style={{
                          fontFamily: 'var(--font-family-body)',
                          fontSize: 'var(--text-base)',
                          fontWeight: 'var(--font-weight-normal)',
                          backgroundColor: 'var(--input-background)',
                          borderColor: '#e0e0e0'
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Reorder Level
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      min="0"
                      value={newItem.minStock || ""} 
                      onChange={(e) => setNewItem({ ...newItem, minStock: parseInt(e.target.value) || 0 })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Unit Cost ($) <span style={{ color: 'var(--destructive)' }}>*</span>
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      step="0.01" 
                      min="0"
                      value={newItem.cost || ""} 
                      onChange={(e) => setNewItem({ ...newItem, cost: parseFloat(e.target.value) || 0 })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Assigned To (Optional)
                    </Label>
                    <Input 
                      placeholder="Team member name" 
                      value={newItem.assignedTo} 
                      onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })} 
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-normal)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Project
                    </Label>
                    <Select 
                      value={newItem.linkedProjectId || "none"} 
                      onValueChange={(value) => setNewItem({ 
                        ...newItem, 
                        linkedProjectId: value === "none" ? "" : value,
                        linkedPhase: "" // Reset phase when project changes
                      })}
                    >
                      <SelectTrigger style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}>
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects && projects.length > 0 ? (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-projects" disabled>No projects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{
                      fontFamily: 'var(--font-family-heading)',
                      fontWeight: 'var(--font-weight-bold)',
                      fontVariationSettings: "'wdth' 137",
                      fontSize: 'var(--text-label)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>
                      Phase
                    </Label>
                    <Select 
                      value={newItem.linkedPhase || "none"} 
                      onValueChange={(value) => setNewItem({ 
                        ...newItem, 
                        linkedPhase: value === "none" ? "" : value
                      })}
                      disabled={!newItem.linkedProjectId}
                    >
                      <SelectTrigger style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-base)',
                        backgroundColor: 'var(--input-background)',
                        borderColor: '#e0e0e0'
                      }}>
                        <SelectValue placeholder={newItem.linkedProjectId ? "Select phase..." : "Select project first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {newItem.linkedProjectId && projects && projects.length > 0 && projects.find(p => String(p.id) === newItem.linkedProjectId)?.phases?.map((phase, index) => (
                          <SelectItem key={index} value={phase.name}>
                            {phase.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4" style={{ gap: '12px', paddingTop: '16px' }}>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      // Reset form on cancel
                      setNewItem({
                        name: "",
                        type: "",
                        category: "",
                        quantity: 0,
                        unit: "",
                        customUnit: "",
                        showCustomUnitInput: false,
                        minStock: 0,
                        cost: 0,
                        supplier: 0,
                        location: "",
                        assignedTo: "",
                        lastRestocked: new Date().toISOString().split('T')[0],
                        linkedProjectId: "",
                        linkedPhase: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateItem}
                    disabled={!isFormValid()}
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Tools</p>
              <h2 className="mt-2" style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontVariationSettings: "'wdth' 137"
              }}>
                {tools.length}
              </h2>
            </div>
            <Wrench className="w-8 h-8 text-primary opacity-80" />
          </div>
        </Card>
        <Card className="p-6" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Materials</p>
              <h2 className="mt-2" style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontVariationSettings: "'wdth' 137"
              }}>
                {materials.length}
              </h2>
            </div>
            <Box className="w-8 h-8 text-accent opacity-80" />
          </div>
        </Card>
        <Card className="p-6" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Total Value</p>
              <h2 className="mt-2" style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontVariationSettings: "'wdth' 137"
              }}>
                ${totalValue.toLocaleString()}
              </h2>
            </div>
            <Package className="w-8 h-8 text-primary opacity-80" />
          </div>
        </Card>
        <Card className="p-6" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>Low Stock Alerts</p>
              <h2 className="mt-2" style={{ 
                fontFamily: 'var(--font-family-heading)',
                fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-extrabold)',
                fontVariationSettings: "'wdth' 137"
              }}>
                {lowStockItems.length}
              </h2>
            </div>
            <AlertCircle className="w-8 h-8 text-destructive opacity-80" />
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Alert className="border-destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <span>
              {lowStockItems.length} materials need reordering:{" "}
              {lowStockItems.map((item) => item.name).join(", ")}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-[12px]">
        <TableFilter
          filters={filterConfig}
          onFilterChange={setFilters}
          searchPlaceholder="Search by name, category, assigned to..."
          sortOptions={sortOptions}
        />
      </div>

      {/* Inventory Table */}
      <div className="border border-border rounded-[var(--radius)] overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" className="px-0 hover:bg-transparent" style={{ fontSize: 'var(--text-label)' }}>
                  Item Name
                  <ArrowUpDown className="w-4 h-4 ml-2" />
                </Button>
              </TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Type</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Quantity</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Stock Level</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Project</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Phase</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Total Cost</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Location</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)' }}>Status</TableHead>
              <TableHead style={{ fontSize: 'var(--text-label)', textAlign: 'right' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => {
              const stockPercentage = getStockPercentage(item);
              const projectLink = inventoryProjectLinks[item.id];
              const linkedProject = projectLink?.projectId ? projects.find(p => p.id === projectLink.projectId) : null;
              
              return (
                <TableRow key={item.id}>
                  <TableCell style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    <div className="flex items-center gap-2">
                      {item.type === "Equipment" ? (
                        <Wrench className="w-4 h-4 text-primary" />
                      ) : (
                        <Box className="w-4 h-4 text-accent" />
                      )}
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{ fontSize: 'var(--text-small)' }}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {item.quantity.toLocaleString()} {item.unit}
                    </span>
                    {item.type === "Consumable" && item.minStock > 0 && (
                      <>
                        <br />
                        <span className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                          Min: {item.minStock.toLocaleString()}
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.type === "Consumable" && item.minStock > 0 ? (
                      <div className="w-32">
                        <Progress 
                          value={stockPercentage} 
                          className="h-2"
                          style={{
                            backgroundColor: 'var(--secondary)',
                          }}
                        />
                        <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--text-small)' }}>
                          {Math.round(stockPercentage)}%
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {linkedProject ? (
                      <div className="flex items-center gap-1">
                        <span className="text-primary hover:underline cursor-pointer" style={{ fontSize: 'var(--text-small)' }}>
                          {linkedProject.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    {projectLink?.phaseName || "—"}
                  </TableCell>
                  <TableCell style={{ fontWeight: 'var(--font-weight-medium)' }}>
                    ${(item.quantity * item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.location || "—"}</TableCell>
                  <TableCell>{getStatusBadge(item)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-[8px]">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(item);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px]"
                        style={{
                          fontFamily: 'var(--font-family-body)',
                          fontSize: 'var(--text-label)'
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-[4px]" />
                        Edit
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(item);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px] text-destructive hover:text-destructive hover:bg-destructive/10"
                        style={{
                          fontFamily: 'var(--font-family-body)',
                          fontSize: 'var(--text-label)'
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-[4px]" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--text-h3)',
              fontWeight: 'var(--font-weight-extrabold)',
              fontVariationSettings: "'wdth' 137"
            }}>
              Edit Inventory Item
            </DialogTitle>
            <DialogDescription style={{
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-base)'
            }}>
              Update the item details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-[16px] py-[16px]">
            {/* Item Name */}
            <div>
              <Label style={{
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 'var(--font-weight-bold)',
                fontVariationSettings: "'wdth' 137",
                fontSize: 'var(--text-label)',
                display: 'block',
                marginBottom: '8px'
              }}>
                Item Name <span style={{ color: 'var(--destructive)' }}>*</span>
              </Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Paint - Interior White"
                style={{
                  fontFamily: 'var(--font-family-body)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-normal)',
                  backgroundColor: 'var(--input-background)',
                  borderColor: '#e0e0e0'
                }}
              />
            </div>

            {/* Type and Category */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Type <span style={{ color: 'var(--destructive)' }}>*</span>
                </Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Consumable">Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Category <span style={{ color: 'var(--destructive)' }}>*</span>
                </Label>
                <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
                  <SelectTrigger style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <Label style={{
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 'var(--font-weight-bold)',
                fontVariationSettings: "'wdth' 137",
                fontSize: 'var(--text-label)',
                display: 'block',
                marginBottom: '8px'
              }}>
                Quantity <span style={{ color: 'var(--destructive)' }}>*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={editForm.quantity || ""}
                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                style={{
                  fontFamily: 'var(--font-family-body)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-normal)',
                  backgroundColor: 'var(--input-background)',
                  borderColor: '#e0e0e0'
                }}
              />
            </div>

            {/* Unit and Location */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Unit <span style={{ color: 'var(--destructive)' }}>*</span>
                </Label>
                <Select value={editForm.unit} onValueChange={handleEditUnitChange}>
                  <SelectTrigger style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editForm.showCustomUnitInput && (
                  <Input
                    className="mt-[8px]"
                    placeholder="Enter custom unit"
                    value={editForm.customUnit}
                    onChange={(e) => setEditForm({ ...editForm, customUnit: e.target.value })}
                    style={{
                      fontFamily: 'var(--font-family-body)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-normal)',
                      backgroundColor: 'var(--input-background)',
                      borderColor: '#e0e0e0'
                    }}
                  />
                )}
              </div>

              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Location
                </Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g., Shop, Van A"
                  style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-normal)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}
                />
              </div>
            </div>

            {/* Min Stock and Cost */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Min Stock Level
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.minStock || ""}
                  onChange={(e) => setEditForm({ ...editForm, minStock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-normal)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}
                />
              </div>

              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Unit Cost ($)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.cost || ""}
                  onChange={(e) => setEditForm({ ...editForm, cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-normal)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}
                />
              </div>
            </div>

            {/* Assigned To */}
            <div>
              <Label style={{
                fontFamily: 'var(--font-family-heading)',
                fontWeight: 'var(--font-weight-bold)',
                fontVariationSettings: "'wdth' 137",
                fontSize: 'var(--text-label)',
                display: 'block',
                marginBottom: '8px'
              }}>
                Assigned To {editForm.type === "Equipment" && "(Optional)"}
              </Label>
              <Input
                value={editForm.assignedTo}
                onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                placeholder="Person or project name"
                style={{
                  fontFamily: 'var(--font-family-body)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-normal)',
                  backgroundColor: 'var(--input-background)',
                  borderColor: '#e0e0e0'
                }}
              />
            </div>

            {/* Project Link */}
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Project (Optional)
                </Label>
                <Select 
                  value={editForm.linkedProjectId || "none"} 
                  onValueChange={(value) => {
                    const projectId = value === "none" ? "" : value;
                    setEditForm({ 
                      ...editForm, 
                      linkedProjectId: projectId,
                      linkedPhase: "" // Reset phase when project changes
                    });
                  }}
                >
                  <SelectTrigger style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontVariationSettings: "'wdth' 137",
                  fontSize: 'var(--text-label)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Phase {editForm.linkedProjectId && <span style={{ color: 'var(--destructive)' }}>*</span>}
                </Label>
                <Select
                  value={editForm.linkedPhase || "none"}
                  onValueChange={(value) => {
                    const phase = value === "none" ? "" : value;
                    setEditForm({ ...editForm, linkedPhase: phase });
                  }}
                  disabled={!editForm.linkedProjectId}
                >
                  <SelectTrigger style={{
                    fontFamily: 'var(--font-family-body)',
                    fontSize: 'var(--text-base)',
                    backgroundColor: 'var(--input-background)',
                    borderColor: '#e0e0e0'
                  }}>
                    <SelectValue placeholder={editForm.linkedProjectId ? "Select phase" : "Select project first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {editForm.linkedProjectId && editForm.linkedProjectId !== "none" && (() => {
                      const selectedProject = projects?.find(p => p.id === editForm.linkedProjectId);
                      const phases = selectedProject?.phases as any[] || [];
                      return phases.map((phase: any) => (
                        <SelectItem key={phase.name} value={phase.name}>
                          {phase.name}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: 'var(--text-h3)',
              fontWeight: 'var(--font-weight-extrabold)',
              fontVariationSettings: "'wdth' 137"
            }}>
              Delete Inventory Item?
            </AlertDialogTitle>
            <AlertDialogDescription style={{
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-base)'
            }}>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{
              fontFamily: 'var(--font-family-body)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-medium)'
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}