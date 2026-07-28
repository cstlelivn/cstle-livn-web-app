/**
 * KV Store to PostgreSQL Migration Script
 * 
 * This script migrates data from the existing KV store to PostgreSQL tables.
 * Run this ONCE after setting up the PostgreSQL schema.
 * 
 * IMPORTANT: This script is idempotent - it can be run multiple times safely.
 * It will upsert data (insert or update on conflict).
 */

import { supabase } from '@/src/lib/supabaseClient';

// Import your KV API functions
// Replace these with actual imports from your existing KV client
// Example:
// import { projectAPI, taskAPI, teamAPI, vendorAPI } from '../utils/supabase/client';

interface MigrationStats {
  projects: number;
  tasks: number;
  teamMembers: number;
  vendors: number;
  clients: number;
  leads: number;
  inventory: number;
  transactions: number;
  errors: string[];
}

export async function migrateKVToPostgres(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    projects: 0,
    tasks: 0,
    teamMembers: 0,
    vendors: 0,
    clients: 0,
    leads: 0,
    inventory: 0,
    transactions: 0,
    errors: [],
  };

  console.log('🚀 Starting KV → PostgreSQL migration...');

  try {
    // ===== PROJECTS =====
    console.log('📦 Migrating projects...');
    // Fetch from KV (replace with your actual KV fetch logic)
    // const kvProjects = await projectAPI.getAll();
    // const projectsData = kvProjects.projects || [];
    
    // For now, this is a placeholder
    const projectsData: any[] = [];
    
    if (projectsData.length > 0) {
      const { error: projectsError, count } = await supabase
        .from('projects')
        .upsert(projectsData, { onConflict: 'id' });
      
      if (projectsError) {
        stats.errors.push(`Projects migration error: ${projectsError.message}`);
        console.error('❌ Projects error:', projectsError);
      } else {
        stats.projects = count || projectsData.length;
        console.log(`✅ Migrated ${stats.projects} projects`);
      }
    }

    // ===== TASKS =====
    console.log('📦 Migrating tasks...');
    const tasksData: any[] = [];
    
    if (tasksData.length > 0) {
      const { error: tasksError, count } = await supabase
        .from('tasks')
        .upsert(tasksData, { onConflict: 'id' });
      
      if (tasksError) {
        stats.errors.push(`Tasks migration error: ${tasksError.message}`);
        console.error('❌ Tasks error:', tasksError);
      } else {
        stats.tasks = count || tasksData.length;
        console.log(`✅ Migrated ${stats.tasks} tasks`);
      }
    }

    // ===== TEAM MEMBERS =====
    console.log('📦 Migrating team members...');
    const teamData: any[] = [];
    
    if (teamData.length > 0) {
      const { error: teamError, count } = await supabase
        .from('team_members')
        .upsert(teamData, { onConflict: 'id' });
      
      if (teamError) {
        stats.errors.push(`Team members migration error: ${teamError.message}`);
        console.error('❌ Team members error:', teamError);
      } else {
        stats.teamMembers = count || teamData.length;
        console.log(`✅ Migrated ${stats.teamMembers} team members`);
      }
    }

    // ===== VENDORS =====
    console.log('📦 Migrating vendors...');
    const vendorsData: any[] = [];
    
    if (vendorsData.length > 0) {
      const { error: vendorsError, count } = await supabase
        .from('vendors')
        .upsert(vendorsData, { onConflict: 'id' });
      
      if (vendorsError) {
        stats.errors.push(`Vendors migration error: ${vendorsError.message}`);
        console.error('❌ Vendors error:', vendorsError);
      } else {
        stats.vendors = count || vendorsData.length;
        console.log(`✅ Migrated ${stats.vendors} vendors`);
      }
    }

    // ===== CLIENTS =====
    console.log('📦 Migrating clients...');
    const clientsData: any[] = [];
    
    if (clientsData.length > 0) {
      const { error: clientsError, count } = await supabase
        .from('clients')
        .upsert(clientsData, { onConflict: 'id' });
      
      if (clientsError) {
        stats.errors.push(`Clients migration error: ${clientsError.message}`);
        console.error('❌ Clients error:', clientsError);
      } else {
        stats.clients = count || clientsData.length;
        console.log(`✅ Migrated ${stats.clients} clients`);
      }
    }

    // ===== LEADS =====
    console.log('📦 Migrating leads...');
    const leadsData: any[] = [];
    
    if (leadsData.length > 0) {
      const { error: leadsError, count } = await supabase
        .from('leads')
        .upsert(leadsData, { onConflict: 'id' });
      
      if (leadsError) {
        stats.errors.push(`Leads migration error: ${leadsError.message}`);
        console.error('❌ Leads error:', leadsError);
      } else {
        stats.leads = count || leadsData.length;
        console.log(`✅ Migrated ${stats.leads} leads`);
      }
    }

    // ===== INVENTORY =====
    console.log('📦 Migrating inventory...');
    const inventoryData: any[] = [];
    
    if (inventoryData.length > 0) {
      const { error: inventoryError, count } = await supabase
        .from('inventory')
        .upsert(inventoryData, { onConflict: 'id' });
      
      if (inventoryError) {
        stats.errors.push(`Inventory migration error: ${inventoryError.message}`);
        console.error('❌ Inventory error:', inventoryError);
      } else {
        stats.inventory = count || inventoryData.length;
        console.log(`✅ Migrated ${stats.inventory} inventory items`);
      }
    }

    // ===== TRANSACTIONS =====
    console.log('📦 Migrating transactions...');
    const transactionsData: any[] = [];
    
    if (transactionsData.length > 0) {
      const { error: transactionsError, count } = await supabase
        .from('transactions')
        .upsert(transactionsData, { onConflict: 'id' });
      
      if (transactionsError) {
        stats.errors.push(`Transactions migration error: ${transactionsError.message}`);
        console.error('❌ Transactions error:', transactionsError);
      } else {
        stats.transactions = count || transactionsData.length;
        console.log(`✅ Migrated ${stats.transactions} transactions`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('📊 Summary:', stats);

    if (stats.errors.length > 0) {
      console.warn('⚠️ Migration completed with errors:', stats.errors);
    }

    return stats;
  } catch (error: any) {
    console.error('❌ Fatal migration error:', error);
    stats.errors.push(`Fatal error: ${error.message}`);
    throw error;
  }
}

// Uncomment to run migration (one-time)
// migrateKVToPostgres().then(() => console.log('Migration finished'));
