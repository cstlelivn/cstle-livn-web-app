# Fixing Realtime Connection Errors

If you're seeing errors like:
```
❌ Failed to connect to team_members-ins:team_members
❌ Failed to connect to leads-ins:leads
```

This means Realtime is not properly enabled for your tables. Follow these steps:

## Quick Fix (Recommended)

### Option 1: SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the sidebar
3. Create a new query
4. Copy and paste the contents of `/src/db/enable-realtime.sql`
5. Click **Run** to execute the script
6. Check the output - you should see "✅ Enabled" for all tables

### Option 2: Supabase Dashboard UI
1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. You'll see a list of tables
4. Enable replication for these tables:
   - `users`
   - `projects`
   - `tasks`
   - `task_updates`
   - `qc_requests`
   - `phase_qc_reviews`
   - `messages`
   - `team_members`
   - `vendors`
   - `clients`
   - `leads`
   - `inventory`
   - `transactions`
   - `activities`
   - `task_templates`

## Verification

After enabling Realtime, refresh your app. The console should show:
```
✅ Connected to team_members-ins:team_members
✅ Connected to leads-ins:leads
```

Instead of the error messages.

## Common Issues

### Issue: "publication supabase_realtime does not exist"
**Solution:** Realtime is not enabled for your Supabase project. 
- Contact Supabase support or check if you're on a plan that includes Realtime
- Free tier projects have Realtime enabled by default

### Issue: Still seeing errors after running the script
**Solution:** 
1. Check if RLS (Row Level Security) policies are properly set up
2. Run `/src/db/policies.sql` to ensure policies allow read/write access
3. Verify your `SUPABASE_ANON_KEY` is correct in your environment

### Issue: Some tables work but others don't
**Solution:**
1. Check the verification query output in `enable-realtime.sql`
2. Manually add missing tables using:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.table_name;
   ```

## Technical Details

Realtime requires:
1. **REPLICA IDENTITY FULL** - Allows tracking all changes including deletes
2. **Publication** - Tables must be added to `supabase_realtime` publication
3. **RLS Policies** - Proper SELECT/INSERT/UPDATE/DELETE policies must exist
4. **WebSocket Connection** - Client must have valid credentials

All of these are handled by the setup scripts in `/src/db/`.

## Need Help?

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project is on a plan that supports Realtime
3. Check Supabase Dashboard → **Logs** for server-side errors
4. Ensure your network allows WebSocket connections (check firewall/proxy)
