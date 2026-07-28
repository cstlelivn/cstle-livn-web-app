import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";

interface ClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: any) => void;
  initialData?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export default function ClientDialog({ isOpen, onClose, onAddClient, initialData }: ClientDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    projectType: "",
    notes: "",
  });

  // Populate form with initial data if provided (e.g., from lead conversion)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData, isOpen]);

  const projectTypes = [
    "Residential - Single Family",
    "Residential - Multi-Unit",
    "Commercial - Office",
    "Commercial - Retail",
    "Renovation",
    "New Construction",
    "ADU",
    "Basement Build",
    "Other"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Send data matching the ClientInput interface
    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      company: formData.company || null,
      notes: formData.notes || null,
      status: "Active",
      projects_count: 0,
      total_value: 0,
      source: null,
      last_contact: new Date().toISOString().split('T')[0],
    };

    onAddClient(clientData);
    toast.success(`Client ${formData.name} added successfully!`);

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      company: "",
      projectType: "",
      notes: "",
    });

    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px]">Add New Client</DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] font-normal text-[10px]">
            Create a new client profile for Cstle Livn
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-[20px] mt-4">
          {/* Basic Information */}
          <div className="space-y-[16px]">
            <div>
              <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                Full Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter client name"
                required
                className="font-['Roboto_Mono'] text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                  Email *
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="font-['Roboto_Mono'] text-[11px]"
                />
              </div>

              <div>
                <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                  Phone *
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                  className="font-['Roboto_Mono'] text-[11px]"
                />
              </div>
            </div>

            <div>
              <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                Address
              </Label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main St, City, State"
                className="font-['Roboto_Mono'] text-[11px]"
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-[16px] pt-[16px] border-t border-border">
            <div>
              <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                Company Name
              </Label>
              <Input
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Company name (if applicable)"
                className="font-['Roboto_Mono'] text-[11px]"
              />
            </div>

            <div>
              <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
                Project Type
              </Label>
              <Select value={formData.projectType} onValueChange={(value) => handleChange("projectType", value)}>
                <SelectTrigger className="font-['Roboto_Mono'] text-[11px]">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map(type => (
                    <SelectItem key={type} value={type} className="font-['Roboto_Mono'] text-[11px]">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-[16px] border-t border-border">
            <Label className="font-['Roboto_Mono'] font-bold text-[10px] uppercase mb-2">
              Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any additional notes about the client..."
              rows={4}
              className="font-['Roboto_Mono'] text-[11px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-[12px] justify-end pt-[16px]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="font-['Roboto_Mono'] text-[10px] px-[20px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="font-['Roboto_Mono'] text-[10px] px-[20px]"
            >
              Add Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}