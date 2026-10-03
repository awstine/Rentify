import { supabase } from "../supabase"
import { redirect } from "react-router-dom"
import type { LoaderFunctionArgs } from "react-router-dom"
import type { LandlordVerification, Property } from "../../types/domain"
import { getMyMemberProperties } from "../team"

export async function propertiesLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { properties: [] as Property[] }
  const memberProps = await getMyMemberProperties()
  const memberIds = memberProps.map((m) => m.property_id)
  const { data, error } = await supabase
    .from("properties")
    .select("*, rooms(*)")
    .or(memberIds.length ? `landlord_id.eq.${user.id},id.in.(${memberIds.join(",")})` : `landlord_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
  if (error) console.error("Failed to fetch properties:", error.message)
  return { properties: (data ?? []) as Property[] }
}

export async function propertyDetailLoader({ params }: LoaderFunctionArgs) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const memberProps = await getMyMemberProperties()
  const memberIds = memberProps.map((m) => m.property_id)

  const { data: property, error } = await supabase
    .from("properties")
    .select("*, rooms(*)")
    .eq("id", params.propertyId || "")
    .or(memberIds.includes(params.propertyId || "") ? `landlord_id.eq.${user.id},id.eq.${params.propertyId}` : `landlord_id.eq.${user.id}`)
    .single()

  if (error || !property) throw redirect("/landlord/properties")

  const { data: tenants, error: tenantsError } = await supabase
    .from("leases")
    .select("*, profiles!leases_tenant_id_fkey(full_name, email, phone_number), rooms(room_number)")
    .eq("property_id", params.propertyId || "")
    .order("created_at", { ascending: false })
  if (tenantsError) console.error("Failed to fetch property tenants:", tenantsError.message)

  return { property: property as Property, tenants: (tenants ?? []) as any[] }
}

export async function tenanciesLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tenancies: [] }

  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number), profiles!leases_tenant_id_fkey(full_name, email, phone_number)")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false })

  if (error) console.error("Failed to fetch tenancies:", error.message)
  return { tenancies: (data ?? []) as any[] }
}

export async function invoicesLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { invoices: [] }

  const { data, error } = await supabase
    .from("invoices")
    .select("*, leases(monthly_rent, start_date, end_date), properties(name, location), rooms(room_number), tenants(full_name, phone)")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false })

  if (error) console.error("Failed to fetch invoices:", error.message)
  return { invoices: (data ?? []) as any[] }
}

export async function verificationLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const { data: verification, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) console.error("Failed to fetch verification:", error.message)

  return { verification: (verification as LandlordVerification | null) ?? null }
}

export async function bookingRequestsLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requests: [] }

  // Owner's properties + properties the user is a member of
  const memberProps = await getMyMemberProperties()
  const memberIds = memberProps.map((m) => m.property_id)
  const { data: owned, error: ownedError } = await supabase
    .from("properties")
    .select("id")
    .eq("landlord_id", user.id)
  if (ownedError) console.error("Failed to fetch owned property ids:", ownedError.message)

  const propertyIds = Array.from(new Set([...(owned ?? []).map((p: any) => p.id), ...memberIds]))

  let query = supabase
    .from("booking_requests")
    .select("*, rooms(room_number), properties(name, location)")

  if (propertyIds.length > 0) {
    query = query.in("property_id", propertyIds)
  } else {
    query = query.eq("property_id", "00000000-0000-0000-0000-000000000000")
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) console.error("Failed to fetch booking requests:", error.message)
  return { requests: (data ?? []) as any[] }
}
