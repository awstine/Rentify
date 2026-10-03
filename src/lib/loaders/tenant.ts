import { supabase } from "../supabase"
import { redirect } from "react-router-dom"
import type { LoaderFunctionArgs } from "react-router-dom"
import { getTenantFromSession } from "../../lib/tenant-auth"

export async function tenantDashboardLoader() {
  const tenant = await getTenantFromSession()
  if (!tenant) return { room: null, property: null, tenancy: null, isAssigned: false, userName: "Tenant", tenantId: null }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*, properties(*), room_codes(code, status)")
    .eq("tenant_id", tenant.tenantId)
    .maybeSingle()

  if (roomError) console.error("Failed to fetch room:", roomError.message)

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("*")
    .eq("tenant_id", tenant.tenantId)
    .eq("status", "active")
    .maybeSingle()

  return {
    room: room as any,
    property: (room as any)?.properties ?? null,
    tenancy,
    isAssigned: !!room,
    userName: tenant.fullName,
    tenantId: tenant.tenantId
  }
}

export async function tenantLeasesLoader({ params }: LoaderFunctionArgs) {
  const tenant = await getTenantFromSession()
  if (!tenant) throw redirect("/tenant/login")

  const { data: leases, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number)")
    .eq("tenant_id", tenant.tenantId)
    .order("created_at", { ascending: false })

  if (error) console.error("Failed to fetch leases:", error.message)

  if (params.leaseId) {
    const lease = leases?.find(l => l.id === params.leaseId)
    if (!lease) throw redirect("/tenant/leases")
    return { lease }
  }

  return { leases: (leases ?? []) as any[] }
}
