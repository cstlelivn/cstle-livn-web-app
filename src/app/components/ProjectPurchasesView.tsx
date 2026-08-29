import { useState, useEffect } from "react";
import { Package, Calendar, DollarSign, Trash2, Filter, Edit2, ExternalLink } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import EditProjectPurchaseDialog from "./EditProjectPurchaseDialog";
import { 
  getProjectPurchases, 
  deleteProjectPurchase, 
  type ProjectPurchase 
} from "../src/features/purchases/projectPurchasesApi";
import { useAdjacentColumnResize } from "../hooks/useAdjacentColumnResize";
import { formatDate } from "../src/lib/dates";

interface ProjectPurchasesViewProps {
  projectId: string;
  projectPhases: string[];
  onPurchaseChange?: () => void;
}

export default function ProjectPurchasesView({ projectId, projectPhases, onPurchaseChange }: ProjectPurchasesViewProps) {
  const { inventory } = useApp();
  
  const [purchases, setPurchases] = useState<ProjectPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<ProjectPurchase | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<ProjectPurchase | null>(null);
  const purchaseColumns = useAdjacentColumnResize([135, 260, 160, 90, 120, 130, 250, 84]);

  // Load purchases
  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading purchases for project:', projectId);
      const data = await getProjectPurchases(projectId);
      console.log('✅ Purchases loaded:', data.length, 'items', data);
      setPurchases(data);
    } catch (error: any) {
      console.error("❌ Error loading purchases:", error);
      toast.error(`Failed to load purchases: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadPurchases();
      
      // Setup realtime subscription for project_purchases
      const supabase = (window as any).__supabase;
      if (supabase) {
        const channel = supabase
          .channel(`project_purchases_${projectId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'project_purchases',
              filter: `project_id=eq.${projectId}`,
            },
            (payload: any) => {
              console.log('Purchase change detected:', payload);
              loadPurchases();
              onPurchaseChange?.();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [projectId]);

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase) => {
    if (filterPhase !== "all" && purchase.phaseName !== filterPhase) return false;
    
    if (filterDateFrom) {
      const purchaseDate = new Date(purchase.purchaseDate);
      const fromDate = new Date(filterDateFrom);
      if (purchaseDate < fromDate) return false;
    }
    
    if (filterDateTo) {
      const purchaseDate = new Date(purchase.purchaseDate);
      const toDate = new Date(filterDateTo);
      if (purchaseDate > toDate) return false;
    }
    
    return true;
  });

  // Get inventory item name
  const getInventoryName = (inventoryId?: string): string => {
    if (!inventoryId) return "—";
    const item = inventory.find((inv) => inv.id.toString() === inventoryId);
    return item?.name || "—";
  };

  // Handle delete
  const handleDeleteClick = (purchase: ProjectPurchase) => {
    setSelectedPurchase(purchase);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPurchase) return;

    try {
      await deleteProjectPurchase(selectedPurchase.id);
      toast.success("Purchase deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedPurchase(null);
      loadPurchases(); // Reload
      onPurchaseChange?.(); // Notify parent
    } catch (error: any) {
      console.error("Error deleting purchase:", error);
      toast.error(`Failed to delete purchase: ${error.message}`);
    }
  };

  // Handle edit
  const handleEditClick = (purchase: ProjectPurchase) => {
    setPurchaseToEdit(purchase);
    setEditDialogOpen(true);
  };

  const handleConfirmEdit = () => {
    setEditDialogOpen(false);
    setPurchaseToEdit(null);
    loadPurchases(); // Reload
    onPurchaseChange?.(); // Notify parent
  };

  // Calculate totals
  const totalSpent = filteredPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);

  return (
    <div className="space-y-[16px]">
      {/* Filters */}
      <Card className="p-[16px]">
        <div className="flex items-center gap-[12px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span
            style={{
              fontFamily: "var(--font-family-heading)",
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-bold)",
              fontVariationSettings: "'wdth' 137",
            }}
          >
            FILTERS
          </span>
        </div>

        <div className="grid grid-cols-3 gap-[12px] mt-[12px]">
          {/* Phase Filter */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Phase
            </label>
            <Select value={filterPhase} onValueChange={setFilterPhase}>
              <SelectTrigger
                style={{
                  fontFamily: "var(--font-family-body)",
                  fontSize: "var(--text-base)",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {projectPhases.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              From Date
            </label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>

          {/* Date To */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-label)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              To Date
            </label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="p-[16px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            <DollarSign className="w-5 h-5 text-accent" />
            <span
              style={{
                fontFamily: "var(--font-family-heading)",
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-bold)",
                fontVariationSettings: "'wdth' 137",
              }}
            >
              TOTAL SPENT {filterPhase !== "all" ? `(${filterPhase})` : ""}
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-h2)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--accent)",
            }}
          >
            ${totalSpent.toFixed(2)}
          </span>
        </div>
      </Card>

      {/* Purchases Table */}
      <Card className="p-[16px]">
        {isLoading ? (
          <div
            className="text-center py-[32px]"
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
              color: "var(--muted-foreground)",
            }}
          >
            Loading purchases...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div
            className="text-center py-[32px]"
            style={{
              fontFamily: "var(--font-family-body)",
              fontSize: "var(--text-base)",
              color: "var(--muted-foreground)",
            }}
          >
            No purchases found
          </div>
        ) : (
          <Table className="table-fixed" style={{ minWidth: purchaseColumns.totalWidth }}>
            <colgroup>{purchaseColumns.widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
            <TableHeader>
              <TableRow className="bg-[#f4f5ef]">{["Date", "Item / vendor", "Phase", "Qty", "Unit cost", "Total cost", "Notes", "Actions"].map((label, index) => <TableHead key={label} className={`relative h-9 truncate px-3 font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>{label}{index < 7 && <button type="button" onPointerDown={(event) => purchaseColumns.startResize(index, event)} className="absolute -right-1.5 top-1/2 z-10 h-7 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-[#65733d]/10 opacity-30 hover:opacity-100" aria-label={`Resize ${label} column`} />}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id} tabIndex={0} className="h-12 cursor-pointer hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d]" onClick={() => handleEditClick(purchase)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleEditClick(purchase); }}>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {formatDate(purchase.purchaseDate)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-small)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {purchase.itemName}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-family-body)",
                          fontSize: "var(--text-small)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {purchase.vendor}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        fontFamily: "var(--font-family-body)",
                        fontSize: "var(--text-small)",
                      }}
                    >
                      {purchase.phaseName}
                    </Badge>
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    {purchase.quantity}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    ${purchase.unitCost?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    ${purchase.totalCost?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell
                    style={{
                      fontFamily: "var(--font-family-body)",
                      fontSize: "var(--text-small)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <div className="flex items-center gap-[8px]">
                      {purchase.notes || "—"}
                      {purchase.inventoryId && (
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                          style={{
                            fontFamily: "var(--font-family-body)",
                          }}
                        >
                          <Package className="w-2 h-2 mr-1" />
                          Inv
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-[4px]">
                      <Button
                        onClick={() => handleEditClick(purchase)}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px] text-accent hover:bg-accent/10"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(purchase)}
                        variant="ghost"
                        size="sm"
                        className="h-[28px] px-[8px] text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                fontFamily: "var(--font-family-heading)",
                fontSize: "var(--text-h3)",
                fontWeight: "var(--font-weight-extrabold)",
                fontVariationSettings: "'wdth' 137",
              }}
            >
              Delete Purchase?
            </AlertDialogTitle>
            <AlertDialogDescription
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              This will reverse the inventory update and reduce the project spend by $
              {selectedPurchase?.totalCost?.toFixed(2) || "0.00"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              style={{
                fontFamily: "var(--font-family-body)",
                fontSize: "var(--text-base)",
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Purchase Dialog */}
      <EditProjectPurchaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        purchase={purchaseToEdit}
        projectPhases={projectPhases}
        onSuccess={handleConfirmEdit}
      />
    </div>
  );
}
