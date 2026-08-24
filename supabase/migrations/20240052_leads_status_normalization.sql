-- Normalizes leads.status onto the CRM pipeline's real vocabulary
-- (New / Contacted / Proposal / Won / Lost). Historical rows used
-- "New Lead" and lowercase "converted"/"closed", which the front end
-- never actually offered as edit options and the pipeline stat cards
-- never matched -- this is why converting a lead made it vanish from the
-- Leads list (listLeads() hard-excluded status='converted') while the
-- Pipeline card's "Won" count was actually querying converted CLIENTS
-- instead, with no way to see which lead that corresponded to. Both are
-- fixed in this same deploy at the code level; this migration brings
-- existing rows in line so the fix applies to real historical data too.
UPDATE public.leads SET status = 'New' WHERE status = 'New Lead';
UPDATE public.leads SET status = 'Won' WHERE lower(status) = 'converted';
UPDATE public.leads SET status = 'Lost' WHERE lower(status) = 'closed';

-- clients.status used to be written as lowercase 'new' by lead conversion;
-- the real enum used everywhere else in the app is Lead/Active/Past/Lost.
UPDATE public.clients SET status = 'Active' WHERE status = 'new';
