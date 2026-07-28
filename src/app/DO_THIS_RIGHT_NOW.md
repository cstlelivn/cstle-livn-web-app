# ⚡ FIX IN 60 SECONDS

## The Error
```
Could not find the 'quantity_change' column in the schema cache
```

## The Fix (Do This Right Now)

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/YOUR-PROJECT

### 2. Restart PostgREST
**Settings** → **API** → Find "PostgREST" section → Click **"Restart"**

### 3. Wait 30 Seconds
Let the service fully restart.

### 4. Hard Refresh Browser
- **Windows/Linux**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`

### 5. Test It
Try creating an inventory item in your app.

---

## ✅ Done!

The error should be gone. If not, open `/ULTIMATE_FIX_GUIDE.md` for more solutions.

---

## Why This Works

Your database has the columns, but the API layer's cache is stale. Restarting PostgREST clears the cache and reads the updated schema.

This is a normal thing in Supabase - it happens after schema changes!
