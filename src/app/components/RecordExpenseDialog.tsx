import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { Receipt, Loader2 } from "lucide-react";
import { createExpense } from "../src/features/expenses/api";

interface RecordExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function RecordExpenseDialog({ isOpen, onClose, projectId }: RecordExpenseDialogProps) {
  const { vendors } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    expense_amount: "",
    expense_category: "Materials",
    vendor_id: "none",
    description: "",
    receipt_url: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_amount || Number(formData.expense_amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    
    setIsLoading(true);

    try {
      await createExpense({
        project_id: projectId,
        expense_date: formData.expense_date,
        expense_amount: Number(formData.expense_amount),
        expense_category: formData.expense_category,
        vendor_id: formData.vendor_id === "none" ? undefined : formData.vendor_id,
        description: formData.description,
        receipt_url: formData.receipt_url || undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Expense recorded successfully");
      
      // Reset form
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        expense_amount: "",
        expense_category: "Materials",
        vendor_id: "none",
        description: "",
        receipt_url: "",
        notes: "",
      });
      
      onClose();
    } catch (error: any) {
      console.error('Failed to record expense:', error);
      toast.error(error.message || "Failed to record expense");
    } finally {
      setIsLoading(false);
    }
  };

  const expenseCategories = [
    'Materials',
    'Labor',
    'Equipment',
    'Subcontractor',
    'Permits',
    'Transportation',
    'Tools',
    'Disposal',
    'Other'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h3)', 
            fontWeight: 'var(--font-weight-extrabold)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Receipt className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            Record Project Expense
          </DialogTitle>
          <DialogDescription style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)',
            color: 'var(--muted-foreground)'
          }}>
            Record a project expense or purchase
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-label)', 
                fontWeight: 'var(--font-weight-bold)' 
              }}>
                Expense Date *
              </Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                required
                disabled={isLoading}
                style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}
              />
            </div>
            
            <div>
              <Label style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-label)', 
                fontWeight: 'var(--font-weight-bold)' 
              }}>
                Amount *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.expense_amount}
                onChange={(e) => setFormData({ ...formData, expense_amount: e.target.value })}
                placeholder="0.00"
                required
                disabled={isLoading}
                style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-label)', 
                fontWeight: 'var(--font-weight-bold)' 
              }}>
                Category *
              </Label>
              <Select
                value={formData.expense_category}
                onValueChange={(value) => setFormData({ ...formData, expense_category: value })}
                disabled={isLoading}
              >
                <SelectTrigger style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-base)'
                      }}
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-label)', 
                fontWeight: 'var(--font-weight-bold)' 
              }}>
                Vendor (Optional)
              </Label>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                disabled={isLoading}
              >
                <SelectTrigger style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    value="none"
                    style={{ 
                      fontFamily: 'var(--font-family-body)', 
                      fontSize: 'var(--text-base)'
                    }}
                  >
                    (No vendor)
                  </SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem 
                      key={vendor.id} 
                      value={String(vendor.id)}
                      style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-base)'
                      }}
                    >
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)' 
            }}>
              Description *
            </Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this expense for?"
              required
              disabled={isLoading}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            />
          </div>
          
          <div>
            <Label style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)' 
            }}>
              Receipt URL (Optional)
            </Label>
            <Input
              type="url"
              value={formData.receipt_url}
              onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
              placeholder="https://..."
              disabled={isLoading}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            />
          </div>
          
          <div>
            <Label style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)' 
            }}>
              Notes (Optional)
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              disabled={isLoading}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              disabled={isLoading}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Record Expense
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}