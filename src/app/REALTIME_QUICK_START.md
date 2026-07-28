# ⚡ Realtime Quick Start - Cstle Livn Admin Panel

## 30-Second Setup

### Step 1: Run SQL Script (One Time Only)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Copy all of: `/src/db/enable-realtime.sql`
3. Paste and click **Run**
4. See success messages ✅

### Step 2: Refresh Your App

1. Reload your browser
2. Check console for: `✅ Realtime WebSockets Connected`
3. Done! 🎉

## Quick Test

1. **Open 2 browser windows** side-by-side
2. **Both windows**: Go to Team Management
3. **Window 1**: Add a team member
4. **Window 2**: See it appear instantly

**It works!** All modules now update in realtime.

## What's Realtime Now?

✅ **Team** - Add/Edit/Delete syncs instantly  
✅ **Projects** - Status and progress update live  
✅ **Tasks** - Assignments and status sync  
✅ **Inventory** - Stock levels update in realtime  
✅ **CRM** - Leads and clients sync instantly  
✅ **Vendors** - Updates appear live  
✅ **Financials** - Transactions sync immediately  

## Troubleshooting

### ⚠️ "Realtime Setup Required" warning?
→ Run `/src/db/enable-realtime.sql` in Supabase Dashboard

### ❌ Changes don't appear in other windows?
→ Check browser console for WebSocket connection  
→ Verify SQL script ran successfully  
→ Refresh both windows  

### 🐌 Slow updates (>5 seconds)?
→ Check your internet connection  
→ Check Supabase project status  
→ Try refreshing the page  

## Need Help?

📖 **Full Guide**: `/REALTIME_ENABLED_COMPLETE.md`  
🧪 **Testing Guide**: `/REALTIME_TESTING_GUIDE.md`  
💬 **Supabase Docs**: https://supabase.com/docs/guides/realtime  

---

**No more "refresh to see changes"** - Everything updates live! 🚀
