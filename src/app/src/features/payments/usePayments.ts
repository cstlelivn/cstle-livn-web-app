import { useState, useEffect } from 'react';
import { subscribeTable } from '../../lib/realtime';
import { listPayments } from './api';

export interface Payment {
  id: string;
  client_id: string;
  project_id?: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function usePayments(enabled: boolean = true, filters?: { clientId?: string; projectId?: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    if (!enabled) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await listPayments(filters);
      setPayments(data as Payment[]);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();

    if (!enabled) return;

    // Subscribe to realtime changes
    const unsubscribe = subscribeTable(
      'payments',
      'payments_received',
      '*',
      (payload) => {
        console.log('💰 Realtime payment update:', payload);

        if (payload.eventType === 'INSERT') {
          setPayments(prev => {
            // Check if filters match
            if (filters?.clientId && payload.new.client_id !== filters.clientId) return prev;
            if (filters?.projectId && payload.new.project_id !== filters.projectId) return prev;
            
            return [payload.new as Payment, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setPayments(prev =>
            prev.map(payment =>
              payment.id === payload.new.id ? (payload.new as Payment) : payment
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setPayments(prev => prev.filter(payment => payment.id !== payload.old.id));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, filters?.clientId, filters?.projectId]);

  return {
    payments,
    loading,
    refresh: loadPayments,
  };
}