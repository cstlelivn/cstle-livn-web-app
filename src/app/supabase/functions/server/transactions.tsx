import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

export function createTransactionRoutes(supabase: any, hasPermission: (role: string, permission: string) => boolean) {
  const app = new Hono();

  // ============= GLOBAL TRANSACTIONS ROUTES =============
  
  // Get all global transactions
  app.get("/transactions", async (c) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          project:projects(id, title),
          client:clients(id, name),
          vendor:vendors(id, name)
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ transactions: data || [] });
    } catch (error: any) {
      console.error('Error in GET /transactions:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create global transaction
  app.post("/transactions", async (c) => {
    try {
      const userId = c.get("userId");
      const body = await c.req.json();
      
      const transactionData = {
        type: body.type,
        category: body.category,
        amount: body.amount,
        description: body.description,
        date: body.date || new Date().toISOString(),
        status: body.status || 'Completed',
        project_id: body.project_id || null,
        client_id: body.client_id || null,
        vendor_id: body.vendor_id || null,
        phase_name: body.phase_name || null,
        notes: body.notes || null,
        payment_method: body.payment_method || null,
        recipient_or_vendor: body.recipient_or_vendor || null,
        created_by: userId,
      };

      // Insert global transaction
      const { data: globalTransaction, error: globalError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (globalError) {
        console.error('Error creating global transaction:', globalError);
        return c.json({ error: globalError.message }, 500);
      }

      // If project-linked, also create project transaction
      if (body.project_id) {
        const projectTransactionData = {
          project_id: body.project_id,
          phase_name: body.phase_name || null,
          type: body.type,
          category: body.category,
          amount: body.amount,
          description: body.description,
          date: body.date || new Date().toISOString(),
          status: body.status || 'Completed',
          client_id: body.client_id || null,
          vendor_id: body.vendor_id || null,
          recipient_or_vendor: body.recipient_or_vendor || null,
          notes: body.notes || null,
          payment_method: body.payment_method || null,
          quantity: body.quantity || null,
          unit_cost: body.unit_cost || null,
          inventory_id: body.inventory_id || null,
          created_by: userId,
        };

        const { error: projectError } = await supabase
          .from('project_transactions')
          .insert(projectTransactionData);

        if (projectError) {
          console.error('Error creating project transaction:', projectError);
          // Don't fail the whole request, but log the error
        }
      }

      return c.json({ transaction: globalTransaction });
    } catch (error: any) {
      console.error('Error in POST /transactions:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update transaction
  app.put("/transactions/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const updates = await c.req.json();

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ transaction: data });
    } catch (error: any) {
      console.error('Error in PUT /transactions/:id:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete transaction
  app.delete("/transactions/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting transaction:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE /transactions/:id:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ============= PROJECT TRANSACTIONS ROUTES =============

  // Get all project transactions
  app.get("/project-transactions", async (c) => {
    try {
      const projectId = c.req.query("project_id");

      let query = supabase
        .from('project_transactions')
        .select(`
          *,
          project:projects(id, title),
          client:clients(id, name),
          vendor:vendors(id, name),
          inventory:inventory(id, item_name)
        `)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching project transactions:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ transactions: data || [] });
    } catch (error: any) {
      console.error('Error in GET /project-transactions:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Create project transaction
  app.post("/project-transactions", async (c) => {
    try {
      const userId = c.get("userId");
      const body = await c.req.json();
      
      const transactionData = {
        project_id: body.project_id,
        phase_name: body.phase_name || null,
        type: body.type,
        category: body.category,
        amount: body.amount,
        description: body.description,
        date: body.date || new Date().toISOString(),
        status: body.status || 'Completed',
        client_id: body.client_id || null,
        vendor_id: body.vendor_id || null,
        inventory_id: body.inventory_id || null,
        recipient_or_vendor: body.recipient_or_vendor || null,
        notes: body.notes || null,
        payment_method: body.payment_method || null,
        quantity: body.quantity || null,
        unit_cost: body.unit_cost || null,
        created_by: userId,
      };

      // Insert project transaction
      const { data: projectTransaction, error: projectError } = await supabase
        .from('project_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project transaction:', projectError);
        return c.json({ error: projectError.message }, 500);
      }

      // Also create global transaction for tracking
      const globalTransactionData = {
        type: body.type,
        category: body.category,
        amount: body.amount,
        description: body.description,
        date: body.date || new Date().toISOString(),
        status: body.status || 'Completed',
        project_id: body.project_id,
        client_id: body.client_id || null,
        vendor_id: body.vendor_id || null,
        phase_name: body.phase_name || null,
        notes: body.notes || null,
        payment_method: body.payment_method || null,
        recipient_or_vendor: body.recipient_or_vendor || null,
        created_by: userId,
      };

      const { error: globalError } = await supabase
        .from('transactions')
        .insert(globalTransactionData);

      if (globalError) {
        console.error('Error creating global transaction:', globalError);
        // Don't fail the whole request
      }

      return c.json({ transaction: projectTransaction });
    } catch (error: any) {
      console.error('Error in POST /project-transactions:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Update project transaction
  app.put("/project-transactions/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const updates = await c.req.json();

      const { data, error } = await supabase
        .from('project_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating project transaction:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ transaction: data });
    } catch (error: any) {
      console.error('Error in PUT /project-transactions/:id:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // Delete project transaction
  app.delete("/project-transactions/:id", async (c) => {
    try {
      const id = c.req.param("id");

      const { error } = await supabase
        .from('project_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project transaction:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE /project-transactions/:id:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ============= PROJECT FINANCE SUMMARY =============

  // Get project finance summary
  app.get("/projects/:id/finances", async (c) => {
    try {
      const projectId = c.req.param("id");

      // Get all project transactions
      const { data: projectTransactions, error: transError } = await supabase
        .from('project_transactions')
        .select('*')
        .eq('project_id', projectId);

      if (transError) {
        console.error('Error fetching project transactions:', transError);
        return c.json({ error: transError.message }, 500);
      }

      // Calculate finances
      const transactions = projectTransactions || [];
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const profit = income - expenses;

      // Get project budget
      const { data: project, error: projError } = await supabase
        .from('projects')
        .select('budget')
        .eq('id', projectId)
        .single();

      const budget = project?.budget || 0;
      const budgetRemaining = budget - expenses;

      return c.json({
        income,
        expenses,
        profit,
        budget,
        budgetRemaining,
        transactions: projectTransactions,
      });
    } catch (error: any) {
      console.error('Error in GET /projects/:id/finances:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // ============= FINANCIAL ANALYTICS =============

  // Get financial analytics
  app.get("/analytics/finances", async (c) => {
    try {
      // Get all transactions
      const { data: allTransactions, error } = await supabase
        .from('transactions')
        .select('*');

      if (error) {
        console.error('Error fetching transactions for analytics:', error);
        return c.json({ error: error.message }, 500);
      }

      const transactions = allTransactions || [];

      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netProfit = totalIncome - totalExpenses;

      // Group by category
      const incomeByCategory: Record<string, number> = {};
      const expensesByCategory: Record<string, number> = {};

      transactions.forEach(t => {
        if (t.type === 'income') {
          incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Number(t.amount);
        } else {
          expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
        }
      });

      // Group by month
      const byMonth: Record<string, { income: number; expenses: number; profit: number }> = {};
      
      transactions.forEach(t => {
        const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { income: 0, expenses: 0, profit: 0 };
        }
        if (t.type === 'income') {
          byMonth[month].income += Number(t.amount);
        } else {
          byMonth[month].expenses += Number(t.amount);
        }
        byMonth[month].profit = byMonth[month].income - byMonth[month].expenses;
      });

      return c.json({
        totalIncome,
        totalExpenses,
        netProfit,
        incomeByCategory,
        expensesByCategory,
        byMonth,
      });
    } catch (error: any) {
      console.error('Error in GET /analytics/finances:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  return app;
}
