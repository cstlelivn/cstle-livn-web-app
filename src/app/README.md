# Cstle Livn Admin Panel

## 🚨 SEEING ERRORS RIGHT NOW?

### → Open: [`/DO_THIS_NOW.md`](/DO_THIS_NOW.md) ⭐⭐⭐

**3 copy-paste steps to fix everything (5 minutes)**

Fixes:
- ❌ "relation does not exist" 
- ❌ "Realtime Not Yet Enabled"
- ❌ "TypeError: Failed to fetch"

---

## 🚀 Quick Start

### Seeing Database or Realtime Errors?

**→ Go to: [`/START_HERE.md`](/START_HERE.md)** ⭐ **FIX FIRST**

This will fix:
- "relation does not exist" errors
- "Realtime Not Yet Enabled" warning
- "TypeError: Failed to fetch" errors
- Enable live updates across tabs

**Time**: 5 minutes | **Difficulty**: Easy

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [`/FIX_DATABASE_SETUP_NOW.md`](/FIX_DATABASE_SETUP_NOW.md) | **⭐ Fix database & Realtime errors** (start here if you have errors) |
| [`/SETUP_INSTRUCTIONS.md`](/SETUP_INSTRUCTIONS.md) | Complete setup from scratch |
| [`/INVENTORY_SYSTEM_SUMMARY.md`](/INVENTORY_SYSTEM_SUMMARY.md) | Upgrade to industry-standard inventory system |
| [`/INVENTORY_TESTING_CHECKLIST.md`](/INVENTORY_TESTING_CHECKLIST.md) | Test inventory system end-to-end |
| [`/ADMIN_PANEL_GUIDE.md`](/ADMIN_PANEL_GUIDE.md) | Features and permissions overview |
| [`/WEBSITE_FORMS_API.md`](/WEBSITE_FORMS_API.md) | Connect website forms to capture leads |

---

## 🔧 Design System

All UI components use CSS variables from `/styles/globals.css`:

- **Typography**: Anybody (headings with `fontVariationSettings: "'wdth' 137"`), Roboto Mono (body)
- **Colors**: `--accent` (#748B7B), `--primary`, `--destructive`, etc.
- **Spacing**: Consistent values throughout
- **Radius**: `--radius`, `--radius-card`, `--radius-button`

**To customize**: Edit `/styles/globals.css` - all components will update automatically.

---

## 🏗️ Project Structure

```
/
├── components/           # React components
│   ├── ui/              # ShadCN UI components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── InventoryModule*.tsx
│   ├── ProjectsGroup.tsx
│   └── ...
├── src/
│   ├── db/              # Database schemas
│   ├── features/        # API layers by feature
│   └── lib/             # Utilities
├── styles/
│   └── globals.css      # Design system (edit here!)
└── supabase/
    └── functions/       # Backend server
```

---

## ✅ Quick Health Check

After setup, verify:

- [ ] No Realtime warnings in console
- [ ] Changes sync instantly across browser tabs
- [ ] No "Failed to fetch" errors
- [ ] Can create projects, tasks, leads
- [ ] Inventory system works

---

## 🎯 Key Features

- **Projects & Tasks**: Full project management with Gantt charts, Kanban boards
- **CRM**: Lead capture, client management, pipeline tracking
- **Inventory**: Stock tracking with transaction history (see upgrade guide)
- **Team Management**: Aura performance rating system
- **Vendor Management**: Track suppliers and relationships
- **Finance**: Transaction tracking, budgets, invoices
- **Analytics**: Real-time dashboards and insights
- **Permissions**: Role-based access (Contractor, Manager, Associate, Admin)

---

## 🚨 Common Issues

### "relation does not exist" errors
→ **Fix**: [`/FIX_DATABASE_SETUP_NOW.md`](/FIX_DATABASE_SETUP_NOW.md) ⭐

### "Realtime Not Yet Enabled"
→ **Fix**: [`/FIX_DATABASE_SETUP_NOW.md`](/FIX_DATABASE_SETUP_NOW.md) ⭐

### "TypeError: Failed to fetch"
→ **Fix**: [`/FIX_DATABASE_SETUP_NOW.md`](/FIX_DATABASE_SETUP_NOW.md) → Troubleshooting

### Inventory system issues
→ **Guide**: [`/INVENTORY_SYSTEM_UPGRADE_GUIDE.md`](/INVENTORY_SYSTEM_UPGRADE_GUIDE.md)

---

## 📞 Support

1. Check the documentation above for your specific issue
2. Review browser console for error messages
3. Verify Supabase project status: https://status.supabase.com

---

**Version**: 2.0.0  
**Last Updated**: 2025-01-07  
**Status**: Production Ready ✅
