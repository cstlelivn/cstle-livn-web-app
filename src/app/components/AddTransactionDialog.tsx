import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProjectId?: string | null;
  preselectedPhaseName?: string | null;
  onSuccess?: () => void;
  projects?: any[];
  clients?: any[];
  vendors?: any[];
}

// Category options based on transaction type
const INCOME_CATEGORIES = [
  { value: "client_payment", label: "Client Payment" },
  { value: "project_installment", label: "Project Installment" },
  { value: "refund_received", label: "Refund Received" },
  { value: "general_income", label: "General Income" },
];

const EXPENSE_CATEGORIES = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor / Employee Pay" },
  { value: "subcontractor", label: "Subcontractor Payment" },
  { value: "equipment", label: "Equipment" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "vendor_purchase", label: "Vendor Purchase" },
  { value: "general_expense", label: "General Expense" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "e_transfer", label: "E-transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "wire_transfer", label: "Wire Transfer" },
];

export default function AddTransactionDialog({
  open,
  onOpenChange,
  preselectedProjectId = null,
  preselectedPhaseName = null,
  onSuccess,
  projects = [],
  clients = [],
  vendors = [],
}: AddTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"Pending" | "Completed">("Completed");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(preselectedProjectId);
  const [selectedPhaseName, setSelectedPhaseName] = useState(preselectedPhaseName || "");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [recipientOrVendor, setRecipientOrVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setType("income");
      setCategory("");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("Completed");
      setSelectedProjectId(preselectedProjectId);
      setSelectedPhaseName(preselectedPhaseName || "");
      setSelectedClientId(null);
      setSelectedVendorId(null);
      setRecipientOrVendor("");
      setPaymentMethod("");
      setNotes("");
    }
  }, [open, preselectedProjectId, preselectedPhaseName]);

  // Reset category when type changes
  useEffect(() => {
    setCategory("");
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        type,
        category,
        amount: parseFloat(amount),
        description,
        date: new Date(date).toISOString(),
        status,
        project_id: selectedProjectId || null,
        phase_name: selectedPhaseName || null,
        client_id: selectedClientId || null,
        vendor_id: selectedVendorId || null,
        recipient_or_vendor: recipientOrVendor || null,
        payment_method: paymentMethod || null,
        notes: notes || null,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(transactionData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create transaction");
      }

      toast.success(`Transaction created successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error(error.message || "Failed to create transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            {preselectedProjectId
              ? "Add a transaction to this project"
              : "Add a transaction to track income or expenses"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={(val: "income" | "expense") => setType(val)}>
              <SelectTrigger className="bg-input-background">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-input-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-input-background"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of transaction"
              required
              className="bg-input-background"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-input-background"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val: "Pending" | "Completed") => setStatus(val)}>
              <SelectTrigger className="bg-input-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Selection (optional, unless preselected) */}
          {!preselectedProjectId && (
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select
                value={selectedProjectId || "none"}
                onValueChange={(val) => setSelectedProjectId(val === "none" ? null : val)}
              >
                <SelectTrigger className="bg-input-background">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Phase Name (if project selected) */}
          {(selectedProjectId || preselectedProjectId) && (
            <div className="space-y-2">
              <Label>Phase (Optional)</Label>
              <Input
                type="text"
                value={selectedPhaseName}
                onChange={(e) => setSelectedPhaseName(e.target.value)}
                placeholder="e.g., Framing, Electrical, etc."
                className="bg-input-background"
              />
            </div>
          )}

          {/* Client Selection (for income) */}
          {type === "income" && (
            <div className="space-y-2">
              <Label>Client (Optional)</Label>
              <Select
                value={selectedClientId || "none"}
                onValueChange={(val) => setSelectedClientId(val === "none" ? null : val)}
              >
                <SelectTrigger className="bg-input-background">
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vendor Selection (for expenses) */}
          {type === "expense" && (
            <div className="space-y-2">
              <Label>Vendor (Optional)</Label>
              <Select
                value={selectedVendorId || "none"}
                onValueChange={(val) => setSelectedVendorId(val === "none" ? null : val)}
              >
                <SelectTrigger className="bg-input-background">
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Vendor</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recipient/Vendor Name (for display) */}
          <div className="space-y-2">
            <Label>
              {type === "income" ? "Received From" : "Paid To"} (Optional)
            </Label>
            <Input
              type="text"
              value={recipientOrVendor}
              onChange={(e) => setRecipientOrVendor(e.target.value)}
              placeholder={type === "income" ? "e.g., Client Name" : "e.g., Vendor/Employee Name"}
              className="bg-input-background"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method (Optional)</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-input-background">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or details"
              className="bg-input-background min-h-[80px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
