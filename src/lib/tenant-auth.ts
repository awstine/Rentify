import { supabase } from "./supabase"
import { redirect } from "react-router-dom"

const TENANT_SESSION_KEY = "tenant_session"

export interface TenantSessionUser {
  tenantId: string
  fullName: string
  phone: string
  email?: string
}

export async function getTenantFromSession(): Promise<TenantSessionUser | null> {
  // Check localStorage for session token
  const token = typeof window !== "undefined" ? localStorage.getItem(TENANT_SESSION_KEY) : null
  if (!token) return null

  const { data: session } = await supabase
    .from("tenant_sessions")
    .select("tenant_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (!session) {
    // Clean up invalid session
    if (typeof window !== "undefined") localStorage.removeItem(TENANT_SESSION_KEY)
    return null
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email")
    .eq("id", session.tenant_id)
    .maybeSingle()

  if (!tenant) return null

  return {
    tenantId: tenant.id,
    fullName: tenant.full_name,
    phone: tenant.phone,
    email: tenant.email,
  }
}

export async function tenantAuthLoader() {
  const tenant = await getTenantFromSession()
  if (!tenant) throw redirect("/tenant/login")

  return {
    userEmail: tenant.email || `${tenant.phone}@rentify.co.ke`,
    userName: tenant.fullName,
    tenantId: tenant.tenantId,
  }
}

export function clearTenantSession() {
  if (typeof window !== "undefined") localStorage.removeItem(TENANT_SESSION_KEY)
}
