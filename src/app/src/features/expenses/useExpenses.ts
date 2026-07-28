import { useState, useEffect } from 'react';
import { subscribeTable } from '../../lib/realtime';
import { listExpenses } from './api';

export interface Expense {
  id: string;
  project_id: string;
  expense_date: string;
  expense_amount: number;
  expense_category: string;
  vendor_id?: string;
  description: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useExpenses(enabled: boolean = true, filters?: { projectId?: string; vendorId?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    if (!enabled) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await listExpenses(filters);
      setExpenses(data as Expense[]);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();

    if (!enabled) return;

    // Subscribe to realtime changes
    const unsubscribe = subscribeTable(
      'expenses',
      'project_expenses',
      '*',
      (payload) => {
        console.log('💸 Realtime expense update:', payload);

        if (payload.eventType === 'INSERT') {
          setExpenses(prev => {
            // Check if filters match
            if (filters?.projectId && payload.new.project_id !== filters.projectId) return prev;
            if (filters?.vendorId && payload.new.vendor_id !== filters.vendorId) return prev;
            
            return [payload.new as Expense, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setExpenses(prev =>
            prev.map(expense =>
              expense.id === payload.new.id ? (payload.new as Expense) : expense
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setExpenses(prev => prev.filter(expense => expense.id !== payload.old.id));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, filters?.projectId, filters?.vendorId]);

  return {
    expenses,
    loading,
    refresh: loadExpenses,
  };
}