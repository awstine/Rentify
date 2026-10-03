-- ============================================================================
-- ⚠️  DEV-ONLY RLS POLICIES — DO NOT RUN AGAINST PRODUCTION ⚠️
-- ============================================================================
-- Purpose: un-block local tenant testing end-to-end:
--     QR join (booking_request) -> landlord approval -> tenant phone+OTP login
--     -> tenant portal (dashboard, leases, invoices, payments, maintenance).
--
-- These policies are intentionally wide open (any anon/authenticated role can
-- read, and the app can create/update the specific rows it needs during the
-- flows above). That is fine for development ONLY.
--
--   • Run in Supabase SQL Editor whenever you need them (idempotent — safe to
--     re-run, and it does NOT duplicate or error).
--   • To remove before production:  delete this file (if you use `supabase
--     db reset`) or run the drop statements at the bottom.
-- ============================================================================


do $$
declare t text;
begin
  -- --------------------------------------------------------------------------
  -- 1) READ access — tables the tenant screens, join page, and session lookups
  --    query. Creates the policy ONLY if the table exists, so this file is safe
  --    even on a fresh local database where the manually-created tables are
  --    not present yet.
  -- --------------------------------------------------------------------------
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

  -- --------------------------------------------------------------------------
  -- 2) CREATE access — rows the app inserts during login / QR join:
  --      tenant_otps      (createOtp: OTP record before "sending" SMS)
  --      tenant_sessions  (verifyLoginOtp: session token after OTP check)
  --      booking_requests (submitBookingRequest: tenant books a room)
  -- --------------------------------------------------------------------------
  foreach t in array array['tenant_otps','tenant_sessions','booking_requests'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop policy if exists %I on public.%I; '
        || 'create policy %I on public.%I for insert to anon, authenticated with check (true);',
        t || '_dev_insert', t, t || '_dev_insert', t
      );
    end if;
  end loop;

  -- --------------------------------------------------------------------------
  -- 3) UPDATE access — join flow flips room status to 'pending' after the
  --    booking request is created.
  -- --------------------------------------------------------------------------
  if to_regclass('public.rooms') is not null then
    execute format(
      'drop policy if exists %I on public.rooms; '
      || 'create policy %I on public.rooms for update to anon, authenticated with check (true);',
      'rooms_dev_update', 'rooms_dev_update'
    );
  end if;

  -- --------------------------------------------------------------------------
  -- 4) DELETE access — createOtp() cleans up stale OTPs for the same
  --    phone/purpose before inserting a fresh one.
  -- --------------------------------------------------------------------------
  if to_regclass('public.tenant_otps') is not null then
    execute format(
      'drop policy if exists %I on public.tenant_otps; '
      || 'create policy %I on public.tenant_otps for delete to anon, authenticated using (true);',
      'tenant_otps_dev_delete', 'tenant_otps_dev_delete'
    );
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 🧾 Confirmation — lists every policy this file manages
-- ----------------------------------------------------------------------------
select tablename, policyname, cmd
from pg_policies
where policyname like '%_dev_%'
order by tablename, cmd;

-- ============================================================================
-- 🗑  PRODUCTION CLEANUP — run these (or just delete this file & `db reset`)
--     when you're ready to harden RLS properly.
-- ============================================================================
-- drop policy if exists tenants_dev_select              on public.tenants;
-- drop policy if exists tenant_otps_dev_select          on public.tenant_otps;
-- drop policy if exists tenant_otps_dev_insert          on public.tenant_otps;
-- drop policy if exists tenant_otps_dev_delete          on public.tenant_otps;
-- drop policy if exists tenant_sessions_dev_select      on public.tenant_sessions;
-- drop policy if exists tenant_sessions_dev_insert      on public.tenant_sessions;
-- drop policy if exists rooms_dev_select                on public.rooms;
-- drop policy if exists rooms_dev_update                on public.rooms;
-- drop policy if exists properties_dev_select           on public.properties;
-- drop policy if exists room_codes_dev_select           on public.room_codes;
-- drop policy if exists tenancies_dev_select            on public.tenancies;
-- drop policy if exists leases_dev_select               on public.leases;
-- drop policy if exists invoices_dev_select             on public.invoices;
-- drop policy if exists payments_dev_select             on public.payments;
-- drop policy if exists maintenance_requests_dev_select on public.maintenance_requests;
-- drop policy if exists property_utilities_dev_select   on public.property_utilities;
-- drop policy if exists room_utilities_dev_select       on public.room_utilities;
-- drop policy if exists booking_requests_dev_select     on public.booking_requests;
-- drop policy if exists booking_requests_dev_insert     on public.booking_requests;
-- drop policy if exists deposits_dev_select             on public.deposits;