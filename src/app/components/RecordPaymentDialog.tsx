import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import { DollarSign, Loader2 } from "lucide-react";
import { createPayment } from "../src/features/payments/api";

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  projectId?: string;
}

export default function RecordPaymentDialog({ isOpen, onClose, clientId, projectId }: RecordPaymentDialogProps) {
  const { clients, projects } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: clientId || "",
    project_id: projectId || "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_amount: "",
    payment_method: "E-Transfer",
    reference_number: "",
    notes: "",
  });

  // Update form when props change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      client_id: clientId || prev.client_id,
      project_id: projectId || prev.project_id,
    }));
  }, [clientId, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.error("Please select a client");
      return;
    }
    
    if (!formData.payment_amount || Number(formData.payment_amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    
    setIsLoading(true);

    try {
      await createPayment({
        client_id: formData.client_id,
        project_id: formData.project_id && formData.project_id !== 'none' ? formData.project_id : undefined,
        payment_date: formData.payment_date,
        payment_amount: Number(formData.payment_amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Payment recorded successfully");
      
      // Reset form
      setFormData({
        client_id: clientId || "",
        project_id: projectId || "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_amount: "",
        payment_method: "E-Transfer",
        reference_number: "",
        notes: "",
      });
      
      onClose();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsLoading(false);
    }
  };

  // Get client projects for the selected client
  const clientProjects = formData.client_id
    ? projects.filter(p => String(p.client) === formData.client_id)
    : [];

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
            <DollarSign className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            Record Payment Received
          </DialogTitle>
          <DialogDescription style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)',
            color: 'var(--muted-foreground)'
          }}>
            Record a payment received from a client
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
                Client *
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value, project_id: "" })}
                disabled={!!clientId || isLoading}
              >
                <SelectTrigger style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem 
                      key={client.id} 
                      value={String(client.id)}
                      style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-base)'
                      }}
                    >
                      {client.name}
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
                Project (Optional)
              </Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                disabled={!formData.client_id || !!projectId || isLoading}
              >
                <SelectTrigger style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    value="none"
                    style={{ 
                      fontFamily: 'var(--font-family-body)', 
                      fontSize: 'var(--text-base)'
                    }}
                  >
                    (No project - General payment)
                  </SelectItem>
                  {clientProjects.map((project) => (
                    <SelectItem 
                      key={project.id} 
                      value={String(project.id)}
                      style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-base)'
                      }}
                    >
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-label)', 
                fontWeight: 'var(--font-weight-bold)' 
              }}>
                Payment Date *
              </Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
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
                Payment Amount *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
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
                Payment Method *
              </Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                disabled={isLoading}
              >
                <SelectTrigger style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['E-Transfer', 'Cash', 'Cheque', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'].map((method) => (
                    <SelectItem 
                      key={method} 
                      value={method}
                      style={{ 
                        fontFamily: 'var(--font-family-body)', 
                        fontSize: 'var(--text-base)'
                      }}
                    >
                      {method}
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
                Reference # (Optional)
              </Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Cheque #, Transaction ID, etc."
                disabled={isLoading}
                style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontSize: 'var(--text-base)'
                }}
              />
            </div>
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
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}