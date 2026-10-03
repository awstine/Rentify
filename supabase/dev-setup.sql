-- ============================================================================
-- ⚠️  DEV-ONLY SETUP — run only for LOCAL TESTING. NOT for production. ⚠️
-- ============================================================================
-- ONE paste that prepares your whole dev database for tenant testing:
--   1. Makes sure the test tenant exists (phone 0712345678).
--   2. Unlocks the tables the app needs (dev-only RLS policies).
--
--   • Safe to run / re-run anytime (idempotent — never duplicates or errors).
--   • You only NEED this file again in 2 situations:
--         a) after a database reset / new project (the locks come back)
--         b) a fresh environment / teammate's machine
--   • Normal daily development: you NEVER touch this. Login just works.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — TEST TENANT (creates if missing; leaves your data untouched)
-- ----------------------------------------------------------------------------
insert into public.tenants (full_name, phone, email)
select 'Test Tenant', '0712345678', 'tenant@rentify.co.ke'
where not exists (select 1 from public.tenants where phone = '0712345678');


-- ----------------------------------------------------------------------------
-- STEP 2 — DEV-ONLY RLS POLICIES (only created if the table exists)
--    Read:  everything the tenant screens + join page + login need
--    Create: tenant_otps / tenant_sessions / booking_requests
--    Update: rooms (join flow flips status to 'pending')
--    Delete: stale tenant_otps on resend
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','tenant_otps','tenant_sessions','rooms','properties','room_codes',
    'tenancies','leases','invoices','payments','maintenance_requests',
    'property_utilities','room_utilities','booking_requests','deposits'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop policy if exists %I on public.%I; '
        || 'create policy %I on public.%I for select to anon, authenticated using (true);',
        t || '_dev_select', t, t || '_dev_select', t
      );
    end if;
  end loop;

  foreach t in array array['tenant_otps','tenant_sessions','booking_requests'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop policy if exists %I on public.%I; '
        || 'create policy %I on public.%I for insert to anon, authenticated with check (true);',
        t || '_dev_insert', t, t || '_dev_insert', t
      );
    end if;
  end loop;

  if to_regclass('public.rooms') is not null then
    execute format(
      'drop policy if exists %I on public.rooms; '
      || 'create policy %I on public.rooms for update to anon, authenticated with check (true);',
      'rooms_dev_update', 'rooms_dev_update'
    );
  end if;

  if to_regclass('public.tenant_otps') is not null then
    execute format(
      'drop policy if exists %I on public.tenant_otps; '
      || 'create policy %I on public.tenant_otps for delete to anon, authenticated using (true);',
      'tenant_otps_dev_delete', 'tenant_otps_dev_delete'
    );
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- STEP 3 — CONFIRMATION
-- ----------------------------------------------------------------------------
select 'test tenant' as thing, id::text as value from public.tenants where phone = '0712345678'
union all
select 'dev policies', string_agg(policyname, ', ')
from pg_policies
where policyname like '%_dev_%';


-- ============================================================================
-- (OPTIONAL) Instantly attach a room so the tenant portal has data to show.
-- Uncomment, replace ROOM_ID first, and re-run once:
-- ============================================================================
-- update public.rooms
-- set tenant_id = (select id from public.tenants where phone = '0712345678'),
--     status = 'occupied'
-- where id = 'ROOM_ID';

-- insert into public.tenancies (tenant_id, room_id, property_id, status, start_date)
-- select t.id, r.id, r.property_id, 'active', current_date
-- from public.tenants t, public.rooms r
-- where t.phone = '0712345678'
--   and r.id = 'ROOM_ID';