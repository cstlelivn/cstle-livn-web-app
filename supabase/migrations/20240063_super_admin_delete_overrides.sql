-- Super Admin deletion authority, without weakening relational guardrails.
--
-- These policies give Super Admin an explicit DELETE path for operational
-- records that the application already exposes as deletable. PostgreSQL
-- foreign keys still stop unsafe/orphaning deletes, and relationship-heavy
-- project/team deletion continues through the dedicated guarded RPCs.
-- Immutable history (work sessions/events, time corrections, Aura/QC and
-- activity logs) is deliberately not included for direct row deletion.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'projects', 'project_phases', 'tasks',
    'clients', 'leads', 'crm_reminders', 'vendors',
    'inventory', 'transactions', 'expenses', 'payments',
    'project_transactions', 'project_purchases', 'procurement_items',
    'project_permits',
    'project_templates', 'phase_templates', 'task_templates',
    'estimate_measurements', 'estimate_documents', 'estimate_media',
    'estimate_takeoff_lines', 'estimating_assemblies',
    'task_checklist_items', 'task_dependencies', 'task_tools',
    'task_materials', 'task_media'
  ] LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS super_admin_delete_override ON public.%I', v_table);
      EXECUTE format(
        'CREATE POLICY super_admin_delete_override ON public.%I FOR DELETE TO authenticated USING (public.is_super_admin())',
        v_table
      );
    END IF;
  END LOOP;
END;
$$;
