import { useState } from "react";
import { Plus, Star, Phone, Mail, MapPin, FileText, TrendingUp, Search, Grid3x3, List } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import { useApp } from "./AppContext";
import { toast } from "sonner";

export default function VendorManagement() {
  const { vendors, addVendor } = useApp(); // Use real vendors from context
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
  });

  // Form state for new vendor
  const [newVendorForm, setNewVendorForm] = useState({
    name: "",
    category: "",
    contactPerson: "",
    phone: "",
    email: "",
    location: "",
    services: "",
  });

  const filteredVendors = vendors
    .filter((vendor) => {
      const matchesSearch = !filters.search ||
        vendor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.contact.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.contact.phone.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesTradeType = !filters.selects?.tradeType ||
        filters.selects.tradeType === "all" ||
        vendor.category === filters.selects.tradeType;
      
      const matchesStatus = !filters.selects?.status ||
        filters.selects.status === "all" ||
        (vendor as any).status === filters.selects.status;
      
      return matchesSearch && matchesTradeType && matchesStatus;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.name.localeCompare(b.name);
        case "rating":
          return order * (a.rating - b.rating);
        case "projectsCompleted":
          return order * (a.totalProjects - b.totalProjects);
        case "contractExpiry":
          return order * (new Date((a as any).contractExpiry || "2025-12-31").getTime() - new Date((b as any).contractExpiry || "2025-12-31").getTime());
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string = "Active") => {
    return status === "Active"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  };

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name, trade type, contact...",
    },
    {
      type: "select",
      field: "tradeType",
      label: "Trade Type",
      options: [
        { value: "Drywall", label: "Drywall" },
        { value: "Electrical", label: "Electrical" },
        { value: "Painting", label: "Painting" },
        { value: "Plumbing", label: "Plumbing" },
        { value: "Framing", label: "Framing" },
      ],
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "Active", label: "Active" },
        { value: "On Hold", label: "On Hold" },
      ],
    },
  ];

  // Sort options
  const sortOptions: SortOption[] = [
    { field: "name", label: "Company Name" },
    { field: "rating", label: "Rating" },
    { field: "projectsCompleted", label: "Projects Completed" },
    { field: "contractExpiry", label: "Contract Expiry" },
  ];

  return (
    <div className="space-y-6 px-[0px] py-[32px]">
      <div className="flex items-center justify-between">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Enter the details of the new vendor to add them to your network.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input placeholder="e.g., Premium Drywall Co." value={newVendorForm.name} onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>Trade Type</Label>
                  <Select value={newVendorForm.category} onValueChange={(value) => setNewVendorForm({ ...newVendorForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="framing">Framing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="drywall">Drywall</SelectItem>
                      <SelectItem value="painting">Painting</SelectItem>
                      <SelectItem value="flooring">Flooring</SelectItem>
                      <SelectItem value="cabinetry">Cabinetry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input placeholder="Primary contact name" value={newVendorForm.contactPerson} onChange={(e) => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input placeholder="(555) 123-4567" value={newVendorForm.phone} onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="contact@vendor.com" value={newVendorForm.email} onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input placeholder="City, State" value={newVendorForm.location} onChange={(e) => setNewVendorForm({ ...newVendorForm, location: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Contract Expiry Date</Label>
                <Input type="date" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="secondary" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  addVendor(newVendorForm);
                  setIsCreateDialogOpen(false);
                  toast.success("Vendor added successfully!");
                }}>
                  Add Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[12px]">
        <TableFilter
          filters={filterConfig}
          onFilterChange={setFilters}
          searchPlaceholder="Search by name, trade type, contact..."
          sortOptions={sortOptions}
        />
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "grid" | "list")}
          className="space-x-2"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid3x3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Vendors View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="mb-2 font-['Roboto_Mono'] font-bold text-[11px]">{vendor.name}</h4>
                  <Badge variant="outline" className="mb-3 text-[9px]">
                    {vendor.category}
                  </Badge>
                </div>
                <Badge className={`${getStatusColor((vendor as any).status)} text-[9px]`}>
                  {(vendor as any).status || "Active"}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(vendor.rating)
                            ? "fill-current"
                            : "fill-none"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-['Roboto_Mono'] font-medium text-[10px]">{vendor.rating}</span>
                  <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                    ({vendor.totalProjects} projects)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span className="font-['Roboto_Mono'] font-normal text-[9px]">{vendor.contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="font-['Roboto_Mono'] font-normal text-[9px]">{vendor.contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="font-['Roboto_Mono'] font-normal text-[9px]">{vendor.contact.address}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">Total Projects:</span>
                  <span className="font-['Roboto_Mono'] font-medium text-[9px]">{vendor.totalProjects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">On-Time Delivery:</span>
                  <span className="font-['Roboto_Mono'] font-medium text-[9px]">{vendor.onTimeDelivery}%</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 text-[9px]"
                onClick={() => setSelectedVendor(vendor)}
              >
                View Details
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-[var(--radius)] overflow-hidden bg-card">
          {/* List Header */}
          <div className="grid grid-cols-[280px_1fr_200px_140px_120px_180px] gap-[24px] px-[20px] py-[14px] bg-secondary/50 border-b border-border">
            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Company</p>
            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Contact</p>
            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Location</p>
            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Rating</p>
            <p className="text-muted-foreground uppercase tracking-wide" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Status</p>
            <p className="text-muted-foreground uppercase tracking-wide text-right" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>Actions</p>
          </div>

          {/* List Rows */}
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => setSelectedVendor(vendor)}
              className="grid grid-cols-[280px_1fr_200px_140px_120px_180px] gap-[24px] px-[20px] py-[16px] border-b border-border/50 hover:bg-accent/5 transition-colors items-center cursor-pointer last:border-b-0"
            >
              {/* Company */}
              <div>
                <p className="mb-[6px]" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{vendor.name}</p>
                <Badge variant="outline" style={{ fontSize: 'var(--text-small)' }}>
                  {vendor.category}
                </Badge>
              </div>

              {/* Contact */}
              <div className="space-y-[6px]">
                <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-normal)' }}>{vendor.contact.phone}</p>
                <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-normal)' }}>{vendor.contact.email}</p>
              </div>

              {/* Location */}
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-normal)' }}>{vendor.contact.address}</p>

              {/* Rating */}
              <div className="flex items-center gap-[8px]">
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-[14px] h-[14px] text-accent ${
                        i < Math.floor(vendor.rating) ? "fill-current" : "fill-none"
                      }`}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>{vendor.rating}</span>
              </div>

              {/* Status */}
              <Badge className={`${getStatusColor((vendor as any).status)}`} style={{ fontSize: 'var(--text-small)' }}>
                {(vendor as any).status || "Active"}
              </Badge>

              {/* Actions */}
              <div className="flex items-center justify-end gap-[8px]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVendor(vendor)}
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Detail Dialog */}
      {selectedVendor && (
        <Dialog open={true} onOpenChange={() => setSelectedVendor(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px]">Vendor Details</DialogTitle>
              <DialogDescription className="font-['Roboto_Mono'] font-normal text-[10px]">
                Complete information and performance history for this vendor
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="mb-1 font-['Roboto_Mono'] font-bold text-[14px]">{selectedVendor.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[9px]">{selectedVendor.category}</Badge>
                    <Badge className={`${getStatusColor((selectedVendor as any).status)} text-[9px]`}>
                      {(selectedVendor as any).status || "Active"}
                    </Badge>
                  </div>
                  <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
                    Contact: {selectedVendor.contact.phone}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="p-4 rounded-[8px] bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(selectedVendor.rating)
                              ? "fill-current"
                              : "fill-none"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-['Roboto_Mono'] font-bold text-[12px]">{selectedVendor.rating}</span>
                  </div>
                  <div>
                    <span className="font-['Roboto_Mono'] font-bold text-[11px]">{selectedVendor.totalProjects}</span>
                    <span className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground ml-1">projects completed</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-['Roboto_Mono'] font-bold text-[9px] text-muted-foreground uppercase mb-2">Contact Information</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="font-['Roboto_Mono'] font-normal text-[10px]">{selectedVendor.contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span className="font-['Roboto_Mono'] font-normal text-[10px]">{selectedVendor.contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="font-['Roboto_Mono'] font-normal text-[10px]">{selectedVendor.contact.address}</span>
                    </div>
                    {selectedVendor.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer" className="font-['Roboto_Mono'] font-normal text-[10px] text-primary hover:underline">
                          {selectedVendor.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-['Roboto_Mono'] font-bold text-[9px] text-muted-foreground uppercase mb-2">Performance Metrics</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">On-Time Delivery:</span>
                      <span className="font-['Roboto_Mono'] font-bold text-[11px]">{selectedVendor.onTimeDelivery}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">Quality Score:</span>
                      <span className="font-['Roboto_Mono'] font-bold text-[11px]">{selectedVendor.qualityScore}/5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">Total Projects:</span>
                      <span className="font-['Roboto_Mono'] font-bold text-[11px]">{selectedVendor.totalProjects}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              {selectedVendor.services && selectedVendor.services.length > 0 && (
                <div>
                  <p className="font-['Roboto_Mono'] font-bold text-[9px] text-muted-foreground uppercase mb-2">Services Provided</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.services.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-[9px]">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-['Roboto_Mono'] font-bold text-[9px] text-muted-foreground uppercase">Performance History</p>
                  <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                    Recent {selectedVendor.totalProjects > 5 ? 5 : selectedVendor.totalProjects} Projects
                  </span>
                </div>
                
                <div className="space-y-2">
                  {/* Sample project history - in real app this would be dynamic */}
                  {[
                    { name: selectedVendor.category + " Work - Recent Project", date: "2024-10", rating: 5.0, status: "Completed" },
                    { name: "Urban Townhouse", date: "2024-09", rating: 4.8, status: "Completed" },
                    { name: "Luxury Apartment", date: "2024-08", rating: 4.9, status: "Completed" },
                    { name: "Modern Office", date: "2024-07", rating: 4.7, status: "Completed" },
                    { name: "Retail Space", date: "2024-06", rating: 5.0, status: "Completed" },
                  ].slice(0, Math.min(5, selectedVendor.projectsCompleted)).map((project, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-[6px] bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-['Roboto_Mono'] font-medium text-[10px] mb-1">{project.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">{project.date}</span>
                          <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">•</span>
                          <Badge variant="outline" className="text-[8px] px-[6px] py-[1px] h-auto">
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-[10px] h-[10px] text-primary ${
                                i < Math.floor(project.rating) ? "fill-current" : "fill-none"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-['Roboto_Mono'] font-medium text-[10px] min-w-[24px]">{project.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                <Button variant="outline" className="w-full text-[10px]">
                  <FileText className="w-4 h-4 mr-2" />
                  View Contract Documents
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}