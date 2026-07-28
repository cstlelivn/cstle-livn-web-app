import { useState } from "react";
import { Plus, Eye, Edit, Download, AlertTriangle, Wrench, Box, TrendingDown, Package } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import { useApp } from "./AppContext";
import InventoryDetailView from "./InventoryDetailView";
import InventoryEditDialog from "./InventoryEditDialog";
import InventoryCreateDialog from "./InventoryCreateDialog";

export default function InventoryModule() {
  const { inventory, isLoadingInventory } = useApp();
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
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

  // Filter inventory
  const filteredInventory = itemsWithStatus
    .filter((item) => {
      const matchesSearch = !filters.search ||
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesCategory = !filters.selects?.category ||
        filters.selects.category === "all" ||
        item.category === filters.selects.category;
      
      const matchesStatus = !filters.selects?.status ||
        filters.selects.status === "all" ||
        item.status === filters.selects.status;
      
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
        default:
          return 0;
      }
    });

  const lowStockItems = itemsWithStatus.filter(
    (item) => item.type === "Consumable" && (item.status === "Low Stock" || item.status === "Critical")
  );

  const tools = itemsWithStatus.filter(item => item.type === "Equipment");
  const materials = itemsWithStatus.filter(item => item.type === "Consumable");

  const totalValue = itemsWithStatus.reduce(
    (sum, item) => sum + item.quantity * item.cost,
    0
  );

  const getStatusBadge = (status: string, type: string) => {
    if (type === "Equipment") {
      if (status === "In Use")
        return <Badge className="bg-accent/10 text-accent">In Use</Badge>;
      if (status === "Available")
        return <Badge className="bg-primary/10 text-primary">Available</Badge>;
      return <Badge variant="outline">{status}</Badge>;
    } else {
      if (status === "Critical")
        return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>;
      if (status === "Low Stock")
        return <Badge className="bg-warning/20" style={{ color: 'var(--warning)' }}>Low Stock</Badge>;
      return <Badge className="bg-success/10" style={{ color: 'var(--success)' }}>In Stock</Badge>;
    }
  };

  const handleViewDetails = (id: string | number) => {
    setSelectedItemId(id);
  };

  const handleEdit = (id: string | number) => {
    setEditingItemId(id);
    setIsEditDialogOpen(true);
  };

  const handleRefresh = () => {
    // Data refreshes automatically via realtime
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingItemId(null);
    handleRefresh();
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    handleRefresh();
  };

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
  ];

  // Show detail view if an item is selected
  if (selectedItemId) {
    return (
      <InventoryDetailView
        inventoryId={selectedItemId}
        onBack={() => setSelectedItemId(null)}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <div className="space-y-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-[12px]">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-[8px]" />
            Add Item
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-[8px]" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[16px]">
        <Card className="p-[20px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground">Tools</p>
              <h2 className="mt-[8px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                {tools.length}
              </h2>
            </div>
            <Wrench className="w-8 h-8 text-primary opacity-80" />
          </div>
        </Card>

        <Card className="p-[20px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground">Materials</p>
              <h2 className="mt-[8px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                {materials.length}
              </h2>
            </div>
            <Box className="w-8 h-8 text-accent opacity-80" />
          </div>
        </Card>

        <Card className="p-[20px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground">Low Stock</p>
              <h2 className="mt-[8px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                {lowStockItems.length}
              </h2>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive opacity-80" />
          </div>
        </Card>

        <Card className="p-[20px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <h2 className="mt-[8px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                ${(totalValue / 1000).toFixed(1)}K
              </h2>
            </div>
            <Package className="w-8 h-8 text-success opacity-80" />
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-[16px] bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-[12px]">
            <AlertTriangle className="w-5 h-5 text-destructive mt-[2px] shrink-0" />
            <div className="flex-1">
              <h4 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
                Low Stock Alert
              </h4>
              <p className="text-muted-foreground mt-[4px]">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filter */}
      <TableFilter
        filters={filters}
        onFiltersChange={setFilters}
        filterConfig={filterConfig}
        sortOptions={sortOptions}
      />

      {/* Inventory Table */}
      <Card>
        <div className="border border-border rounded-[8px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-[32px] text-muted-foreground">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.type === "Consumable" && item.quantity <= item.minStock;
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={isLowStock ? "bg-destructive/5" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-[8px]">
                          {isLowStock && (
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.location || "—"}</TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        {item.minStock} {item.unit}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status, item.type)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-[8px]">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(item.id)}
                            className="h-[28px]"
                          >
                            <Eye className="w-3 h-3 mr-[4px]" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item.id)}
                            className="h-[28px]"
                          >
                            <Edit className="w-3 h-3 mr-[4px]" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <InventoryCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      <InventoryEditDialog
        inventoryId={editingItemId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
