# Phase Templates System Documentation

## Overview

The Phase Templates system is now fully database-backed using Supabase KV storage, making it truly reusable and template-driven across the entire application.

## Architecture

### Backend (Supabase Edge Functions)

**Location:** `/supabase/functions/server/index.tsx`

The backend provides REST APIs for managing phase templates and master phases:

#### Phase Templates API

- `GET /phase-templates` - Fetch all phase templates
- `GET /phase-templates/:id` - Fetch a specific template
- `POST /phase-templates` - Create a new template
- `PUT /phase-templates/:id` - Update an existing template
- `DELETE /phase-templates/:id` - Delete a template

#### Master Phases API

- `GET /master-phases` - Fetch all unique phase names in the system
- `POST /master-phases` - Add a new reusable phase (auto-deduplicates)

#### Data Structure

**KV Storage Keys:**
- Phase Templates: `phase_template:{id}`
- Master Phases: `master_phase:{id}`

**Auto-Initialization:**
On server start, the system automatically initializes:
1. **Default (Cstle Livn)** template with 6 standard phases
2. **FCC Projects** template with 10 construction phases
3. Master phases library extracted from all templates

### Frontend API Client

**Location:** `/src/api/phaseTemplates.ts`

Provides TypeScript functions to interact with the backend:

```typescript
// Fetch all templates
const templates = await fetchPhaseTemplates();

// Create a new template
await createPhaseTemplate("My Template", phases);

// Fetch all master phases
const masterPhases = await fetchMasterPhases();

// Create a new reusable phase
const { phase, existed } = await createMasterPhase("Site Prep", 5);
```

### UI Components

#### Combobox (`/components/ui/combobox.tsx`)

A searchable dropdown with type-ahead and "create new" functionality:

- Lists all master phases
- Supports free-text search
- Shows "Create '{name}'" option when typing a new phase
- Displays days estimate next to each phase
- Auto-fills days input when selecting existing phase

#### EditProjectPhasesDialog (`/components/EditProjectPhasesDialog.tsx`)

**Features:**
1. **Template Selector** - Dropdown showing all database templates (Default, FCC, custom)
2. **Phase Combobox** - Search existing phases or create new ones
3. **Duplicate Prevention** - Won't add the same phase twice to a project
4. **Drag & Drop Reordering** - Adjust phase sequence
5. **Save as Template** - Store current phase configuration for reuse

**Workflow:**
1. Open dialog for a project
2. Choose a template (optional) - loads all phases from that template
3. Add individual phases via combobox - auto-creates in master library if new
4. Edit phase names and days in the table
5. Reorder phases by dragging
6. Save changes to project

#### CreateProjectDialog (`/components/CreateProjectDialog.tsx`)

**Current Status:** ⚠️ Still uses localStorage - needs migration

**To Do:**
- Replace `getPhaseTemplates()` with `fetchPhaseTemplates()`
- Add combobox for phase selection
- Ensure FCC Projects template shows in dropdown
- Use `createMasterPhase()` when creating new phases

## How It Works

### 1. Adding a Phase to a Project

User opens "Manage Project Phases":
1. Types "Demolition" in combobox
2. System searches master phases - found!
3. Auto-fills days from master phase (e.g., 3 days)
4. User adjusts days to 5 for this specific project
5. Clicks + button
6. Phase added to project's phase list

###2. Creating a New Reusable Phase

User types "Custom Foundation Work" (doesn't exist yet):
1. Combobox shows "Create 'Custom Foundation Work'"
2. User clicks it
3. System calls `createMasterPhase()` API
4. Backend saves to `master_phase:{id}`
5. Frontend refreshes master phases list
6. "Custom Foundation Work" now available in dropdown for all future projects
7. Phase name auto-fills in input field

### 3. Using Templates

User creates a new FCC project:
1. Opens "Create Project" dialog
2. Selects "FCC Projects" from template dropdown
3. All 10 FCC phases load into the phase table
4. User can add/remove/edit phases before creating project
5. Project is created with customized FCC phase sequence

## Database Schema

### Phase Template Object
```typescript
{
  id: string;              // Unique identifier
  name: string;            // Template name (e.g., "FCC Projects")
  phases: Array<{
    name: string;          // Phase name
    days: number;          // Estimated duration
  }>;
  createdAt: string;       // ISO timestamp
  updatedAt?: string;      // ISO timestamp (optional)
}
```

### Master Phase Object
```typescript
{
  id: string;              // Unique identifier
  name: string;            // Phase name (e.g., "Planning")
  days: number;            // Default duration
  createdAt: string;       // ISO timestamp
}
```

## Default Templates

### Default (Cstle Livn)
1. Planning (3 days)
2. Prepping (5 days)
3. Production (10 days)
4. Finishing (5 days)
5. Final Inspection (2 days)
6. Delivered/Completed (1 day)

**Total:** 26 days

### FCC Projects
1. Design & Planning (5 days)
2. Permit Acquisition (10 days)
3. Site Preparation (7 days)
4. Foundation Work (14 days)
5. Framing (21 days)
6. Electrical & Plumbing (14 days)
7. Insulation & Drywall (10 days)
8. Interior Finishing (14 days)
9. Final Inspection (3 days)
10. Project Handover (2 days)

**Total:** 100 days

## Future Enhancements

### Planned Features
- [ ] Update CreateProjectDialog to use database APIs
- [ ] Phase categories/tags (e.g., "Structural", "Finishing")
- [ ] Phase dependencies (Phase B can't start until Phase A completes)
- [ ] Template sharing between organizations
- [ ] Template versioning
- [ ] Bulk template import/export
- [ ] Phase cost estimates
- [ ] Resource allocation per phase

### Best Practices

1. **Reuse Before Creating** - Always search master phases before creating new ones
2. **Descriptive Names** - Use clear, specific phase names (e.g., "Electrical Rough-In" not "Electrical")
3. **Reasonable Estimates** - Set realistic default days in master phases
4. **Project-Specific Adjustments** - Edit days after adding to a project if needed
5. **Template Organization** - Create templates for common project types

## Troubleshooting

### Templates not loading
- Check browser console for API errors
- Verify Supabase Edge Functions are running
- Ensure KV store is accessible

### "Create 'X'" not appearing
- Make sure phase name doesn't already exist (search is case-insensitive)
- Check that `onCreateOption` prop is passed to Combobox

### Duplicates in project
- System should prevent this - check `handleAddPhase()` duplicate logic
- If bug occurs, clear and re-add phases

### FCC template not showing in new project creation
- ⚠️ CreateProjectDialog needs migration to database APIs (in progress)
- Temporary: Use "Default (Cstle Livn)" then edit phases manually
