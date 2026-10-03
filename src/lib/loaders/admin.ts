import { supabase } from "../supabase"
import { redirect } from "react-router-dom"
import { createSignedKycUrl, getVerificationQueueWithSignedUrls } from "../../lib/verification"
import { getPropertyListingQueue } from "../../lib/properties"

export async function adminDashboardLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const [landlordsResult, verificationsResult, listingsResult, notificationsResult] = await Promise.all([
    supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "landlord"),
    supabase.from("landlord_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("listing_status", "pending"),
    supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  const totalLandlords = landlordsResult.count || 0

  return {
    totalUsers: totalLandlords,  // Only landlords count as "users" in this system
    totalLandlords,
    totalTenants: 0,  // Tenants join via QR, not traditional signup
    pendingVerifications: verificationsResult.count || 0,
    pendingListings: listingsResult.count || 0,
    pendingNotifications: notificationsResult.count || 0,
  }
}

export async function adminVerificationLoader() {
  const queue = await getVerificationQueueWithSignedUrls()
  return { queue }
}

export async function adminListingsLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const result = await getPropertyListingQueue()
  return { queue: result.queue, error: result.error }
}

function extractNameFromEmail(email: string): string {
  const prefix = email.split("@")[0] || "User"
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, " ")
}

function formatJoined(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase()
  return (name[0] || "?").toUpperCase()
}

export async function adminUsersLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  // Some local schemas lack an `email` column on profiles — try with it first,
  // then retry without it so the page renders either way.
  let profiles: any[] = []
  let profilesError: { message: string } | null = null

  const first = await supabase
    .from("profiles")
    .select("id, full_name, email, phone_number, created_at")
    .order("created_at", { ascending: false })

  if (first.error) {
    const retry = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, created_at")
      .order("created_at", { ascending: false })
    if (retry.error) {
      profilesError = retry.error
    } else {
      profiles = (retry.data ?? []) as any[]
    }
  } else {
    profiles = (first.data ?? []) as any[]
  }

  const rolesResult = await supabase.from("user_roles").select("user_id, role")
  const propertiesResult = await supabase.from("properties").select("landlord_id")
  const verificationsResult = await supabase
    .from("landlord_verifications")
    .select("landlord_id, status, id_number, id_front_url, id_back_url, selfie_url, created_at")
    .order("created_at", { ascending: false })

  const roles = (rolesResult.data ?? []) as { user_id: string; role: string }[]
  const properties = (propertiesResult.data ?? []) as { landlord_id: string }[]
  const verifications = (verificationsResult.data ?? []) as any[]

  const roleMap = new Map<string, string>()
  for (const r of roles) {
    if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role)
  }

  const propCounts = new Map<string, number>()
  for (const prop of properties) {
    propCounts.set(prop.landlord_id, (propCounts.get(prop.landlord_id) || 0) + 1)
  }

  const latestVerification = new Map<string, any>()
  for (const v of verifications) {
    if (!latestVerification.has(v.landlord_id)) latestVerification.set(v.landlord_id, v)
  }

  const users = (await Promise.all(
    profiles.map(async (p: any) => {
      const role = roleMap.get(p.id) || "unknown"
      const isLandlord = role === "landlord"
      const isAdmin = role === "admin"
      const verification = latestVerification.get(p.id)
      const isVerified = verification?.status === "approved"
      const name = p.full_name || extractNameFromEmail(p.email || "")

      let kyc: any = null
      if (isLandlord && verification) {
        const [front, back, selfie] = await Promise.all([
          verification.id_front_url ? createSignedKycUrl(verification.id_front_url) : Promise.resolve(null),
          verification.id_back_url ? createSignedKycUrl(verification.id_back_url) : Promise.resolve(null),
          verification.selfie_url ? createSignedKycUrl(verification.selfie_url) : Promise.resolve(null),
        ])
        kyc = {
          idFront: verification.id_front_url,
          idBack: verification.id_back_url,
          selfie: verification.selfie_url,
          signedIdFront: front,
          signedIdBack: back,
          signedSelfie: selfie,
          idNumber: verification.id_number,
          submitted: verification.created_at,
        }
      }

      return {
        id: p.id,
        initials: initialsFromName(name),
        name,
        phone: p.phone_number || "",
        email: p.email || "—",
        role: isAdmin ? "Admin" : isLandlord ? "Landlord" : "Member",
        status: isVerified ? "Verified" : "Unverified",
        statusTone: isVerified
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
        joined: formatJoined(p.created_at),
        propertyCount: propCounts.get(p.id) || 0,
        isLandlord,
        isAdmin,
        isVerified,
        kyc,
      }
    })
  )).filter((u: any) => u.isLandlord)

  return {
    users,
    error: profilesError ? `Could not load some profile data: ${profilesError.message}` : null,
  }
}
export async function settingsLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone_number")
    .eq("id", user.id)
    .single()

  return { profile }
}
