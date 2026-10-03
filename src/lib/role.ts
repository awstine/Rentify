import { supabase } from "./supabase"

export type AccountRole = "landlord" | "agent" | "caretaker" | "tenant" | "admin"

export async function getRoleForUser(userId: string): Promise<AccountRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.warn("Failed to fetch user role:", error.message)
    return null
  }

  return (data?.role as AccountRole) ?? null
}

export async function getVerificationStatus(userId: string): Promise<"pending" | "approved" | "rejected" | "more_info" | null> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("status")
    .eq("landlord_id", userId)
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (error) {
    console.warn("Failed to fetch verification status:", error.message)
    return null
  }

  return (data?.status as "pending" | "approved" | "rejected" | "more_info") ?? null
}

export function roleRedirectPath(role: AccountRole | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "landlord":
      return "/landlord/properties"
case "agent":
    case "caretaker":
      return "/landlord/properties"
    case "tenant":
      return "/tenant/dashboard"
    default:
      return "/login"
  }
}

// Get redirect path considering verification status
export async function getRedirectPathForUser(userId: string): Promise<string> {
  const role = await getRoleForUser(userId)

  if (role === "landlord") {
    const verificationStatus = await getVerificationStatus(userId)
    // If no verification submitted, or rejected/needs more info → send to verification page
    if (!verificationStatus || verificationStatus === "rejected" || verificationStatus === "more_info") {
      return "/landlord/verification"
    }
    // If pending → send to verification page (shows status)
    if (verificationStatus === "pending") {
      return "/landlord/verification"
    }
    // Only if approved → go to properties
    return "/landlord/properties"
  }

  return roleRedirectPath(role)
}
