# ⚡ RESTART POSTGREST NOW

## The Problem
```
"Could not find the 'auraRating' column of 'team_members' in the schema cache"
"Could not find the 'quantity_change' column of 'inventory_transactions' in the schema cache"
```

## Why It Happens
You ran SQL migrations, but **PostgREST's schema cache is stale**.  
The database has the columns, but the API layer doesn't know about them.

---

## The Fix (3 Steps - 3 Minutes)

### 1️⃣ Run SQL (2 min)
```
Supabase Dashboard → SQL Editor → New Query
```

Copy from: `/FIX_ALL_SCHEMA_CACHE.sql`  
Click: ▶️ **Run**

---

### 2️⃣ Restart PostgREST (1 min) 🔥 CRITICAL
```
Supabase Dashboard → Settings → API → "PostgREST" → Restart
```

**WAIT 30 SECONDS** - This clears the cache!

---

### 3️⃣ Refresh Browser (10 sec)
```
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

## ✅ Test
- Create a team member → Should work ✅
- Create inventory item → Should work ✅
- Link inventory to project → Should work ✅

**All errors fixed!**

---

## Can't Find Restart Button?

**Option A**: Settings → Database → "Restart" button

**Option B**: Pause entire project for 1 min, then resume

**Option C**: Run this SQL 3 times, wait 30 sec each:
```sql
NOTIFY pgrst, 'reload schema';
```

---

## Key Point

**You MUST restart PostgREST service!**  
Running SQL alone is not enough.  
The cache will stay stale until you restart.

---

**Full guide**: `/FIX_SCHEMA_CACHE_FINAL.md`
