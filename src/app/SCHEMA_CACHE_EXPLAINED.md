# 🧠 Understanding Schema Cache Errors

## What's Happening

```
Your App
   ↓
PostgREST API (has stale cache) ❌
   ↓
PostgreSQL Database (has correct columns) ✅
```

**The mismatch**: Database is correct, but API layer's cache is outdated.

---

## Why SQL Alone Doesn't Fix It

### What You Did:
```sql
ALTER TABLE team_members ADD COLUMN aura_rating numeric;
```

### What Happened:

| Component | Status |
|-----------|--------|
| PostgreSQL Database | ✅ Updated immediately |
| PostgREST Cache (in memory) | ❌ Still thinks column doesn't exist |
| Your App | ❌ Gets PGRST204 error |

---

## The Full Fix

### Step 1: Fix Database Structure
```sql
-- Run FIX_ALL_SCHEMA_CACHE.sql
CREATE TABLE team_members (...);
```
**Result**: Database ✅, PostgREST Cache ❌

### Step 2: Clear PostgREST Cache
```
Dashboard → Settings → API → Restart PostgREST
```
**Result**: Database ✅, PostgREST Cache ✅

### Step 3: Clear Browser Cache
```
Ctrl+Shift+R (hard refresh)
```
**Result**: Everything works! ✅

---

## Common Mistakes

### ❌ Mistake 1: Only Running SQL
```sql
ALTER TABLE ... ADD COLUMN ...;
-- Cache is still stale!
```
**Fix**: Also restart PostgREST

### ❌ Mistake 2: Only Running NOTIFY
```sql
NOTIFY pgrst, 'reload schema';
-- Sometimes not enough!
```
**Fix**: Also restart PostgREST service

### ❌ Mistake 3: Not Waiting
```
Restart PostgREST → Test immediately ❌
-- Service hasn't fully restarted yet
```
**Fix**: Wait 30 seconds after restart

### ❌ Mistake 4: Soft Browser Refresh
```
F5 or Ctrl+R ❌
-- Browser cache still has old API responses
```
**Fix**: Hard refresh (Ctrl+Shift+R)

---

## The PostgREST Cache System

```
┌─────────────────────────────────────┐
│         Your Application            │
└────────────┬────────────────────────┘
             │ HTTP Requests
             ↓
┌─────────────────────────────────────┐
│          PostgREST API              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Schema Cache (in memory)  │   │ ← This gets stale!
│  │                              │   │
│  │  • Table structures          │   │
│  │  • Column names              │   │
│  │  • Data types                │   │
│  │  • Relationships             │   │
│  └─────────────────────────────┘   │
│                                     │
└────────────┬────────────────────────┘
             │ SQL Queries
             ↓
┌─────────────────────────────────────┐
│      PostgreSQL Database            │
│                                     │
│  • Actual table structures          │ ← This is always correct!
│  • Real column names                │
│  • Actual data                      │
└─────────────────────────────────────┘
```

---

## How to Prevent This

### Future Schema Changes:

**Always do BOTH steps:**

1️⃣ **Run your SQL migration**
```sql
ALTER TABLE ... ADD COLUMN ...;
NOTIFY pgrst, 'reload schema';
```

2️⃣ **Restart PostgREST service**
```
Dashboard → Settings → API → Restart
```

3️⃣ **Wait 30 seconds before testing**

4️⃣ **Hard refresh browser**

---

## Error Code Reference

### PGRST204
```json
{
  "code": "PGRST204",
  "message": "Could not find the 'column_name' column in the schema cache"
}
```

**Meaning**: PostgREST's cached schema doesn't match the actual database.

**Fix**: Restart PostgREST service to reload schema from database.

---

## Quick Diagnosis

### Is it a schema cache issue?

✅ **YES** if:
- Error code is `PGRST204`
- Error mentions "schema cache"
- You recently ran DDL commands (CREATE TABLE, ALTER TABLE, DROP COLUMN, etc.)
- The column exists in database but API says it doesn't

❌ **NO** if:
- Error is about permissions (PGRST301)
- Error is about authentication
- Column genuinely doesn't exist in database
- Error happens on frontend validation before API call

---

## Testing After Fix

### Verify everything works:

```javascript
// Test team member creation
POST /team_members
{
  "name": "John Doe",
  "role": "Contractor",
  "aura_rating": 85
}
// Should return 201 Created ✅

// Test inventory transaction
POST /inventory_transactions
{
  "inventory_id": "...",
  "type": "purchase",
  "quantity_change": 10,
  "quantity_after": 10
}
// Should return 201 Created ✅
```

---

## Summary

| Action | Effect on DB | Effect on Cache |
|--------|--------------|-----------------|
| Run SQL | ✅ Updates | ❌ No change |
| NOTIFY pgrst | ❌ No change | 🟡 Sometimes updates |
| Restart PostgREST | ❌ No change | ✅ Clears & reloads |
| Hard refresh browser | ❌ No change | ❌ No change (but clears browser cache) |

**You need**: SQL + Restart PostgREST + Hard refresh

---

## Files to Use

- 📄 `/FIX_ALL_SCHEMA_CACHE.sql` - Complete SQL fix
- 📄 `/RESTART_POSTGREST_NOW.md` - Quick instructions
- 📄 `/FIX_SCHEMA_CACHE_FINAL.md` - Detailed guide

---

**The bottom line**: PostgREST caches schema for performance. When schema changes, you must manually restart PostgREST to clear the cache. This is not a bug - it's how Supabase/PostgREST works! 🎯
