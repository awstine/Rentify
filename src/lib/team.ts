import { supabase } from "./supabase"
import type { PropertyMember, CreateTeamMemberInput, TeamMemberRole, TeamPermissions } from "../types/domain"

// ===== Encode permissions jsonb <-> JS object =====

const PERMISSION_KEYS: (keyof TeamPermissions)[] = [
  "view_property",
  "manage_bookings",
  "handle_maintenance",
  "edit_utilities",
  "record_payments",
  "view_finances",
  "manage_team",
]

export function normalizePermissions(raw: any): TeamPermissions {
  const out: TeamPermissions = {
    view_property: false,
    manage_bookings: false,
    handle_maintenance: false,
    edit_utilities: false,
    record_payments: false,
    view_finances: false,
    manage_team: false,
  }
  for (const key of PERMISSION_KEYS) {
    if (typeof raw?.[key] === "boolean") out[key] = raw[key]
  }
  return out
}

// ===== List team members for a property =====

export async function getTeamMembers(propertyId: string): Promise<PropertyMember[]> {
  const { data, error } = await supabase
    .from("property_members")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch team members:", error.message)
    return []
  }
  return (data ?? []).map((m: any) => ({
    ...m,
    permissions: normalizePermissions(m.permissions),
  })) as PropertyMember[]
}

// ===== All properties the current user is a member of =====

export async function getMyMemberProperties(): Promise<{ property_id: string; role: TeamMemberRole; permissions: TeamPermissions }[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("property_members")
    .select("property_id, role, permissions")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (error) {
    console.error("Failed to fetch memberships:", error.message)
    return []
  }
  return (data ?? []).map((m: any) => ({
    property_id: m.property_id,
    role: m.role as TeamMemberRole,
    permissions: normalizePermissions(m.permissions),
  }))
}

// ===== Invite a new team member (landlord creates the account entry) =====

export async function inviteTeamMember(
  propertyId: string,
  input: CreateTeamMemberInput
): Promise<{ success: boolean; member?: PropertyMember; inviteUrl?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const inviteToken = crypto.randomUUID().replace(/-/g, "")
  const { data, error } = await supabase
    .from("property_members")
    .insert({
      id: crypto.randomUUID(),
      property_id: propertyId,
      email: input.email.trim().toLowerCase(),
      full_name: input.full_name.trim(),
      phone_number: input.phone_number?.trim() || null,
      role: input.role,
      permissions: input.permissions,
      status: "invited",
      invite_token: inviteToken,
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  const inviteUrl = `${window.location.origin}/accept-invite?token=${inviteToken}`
  return {
    success: true,
    member: { ...data, permissions: normalizePermissions((data as any).permissions) } as PropertyMember,
    inviteUrl,
  }
}

// ===== Resend invite (new token) =====

export async function resendInviteToken(memberId: string): Promise<{ success: boolean; inviteUrl?: string; error?: string }> {
  const inviteToken = crypto.randomUUID().replace(/-/g, "")
  const { error } = await supabase
    .from("property_members")
    .update({ invite_token: inviteToken, status: "invited", updated_at: new Date().toISOString() })
    .eq("id", memberId)

  if (error) return { success: false, error: error.message }
  return { success: true, inviteUrl: `${window.location.origin}/accept-invite?token=${inviteToken}` }
}
// ===== Update a member's role / permissions / status =====

export async function updateTeamMember(
  memberId: string,
  patch: Partial<Pick<PropertyMember, "role" | "permissions" | "status" | "full_name" | "phone_number">>
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const payload: any = { updated_at: new Date().toISOString() }
  if (patch.role) payload.role = patch.role
  if (patch.permissions) payload.permissions = patch.permissions
  if (patch.status) payload.status = patch.status
  if (patch.full_name !== undefined) payload.full_name = patch.full_name
  if (patch.phone_number !== undefined) payload.phone_number = patch.phone_number

  const { error } = await supabase.from("property_members").update(payload).eq("id", memberId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ===== Remove a member (revoke access) =====

export async function removeTeamMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("property_members").delete().eq("id", memberId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ===== Invite lookup (used by the public accept-invite page) =====
// Goes through a security-definer RPC so anonymous guests can verify an
// invite without ever selecting the property_members table directly.

export async function getInviteByToken(token: string): Promise<(PropertyMember & { property_name?: string; location?: string }) | null> {
  const { data, error } = await supabase.rpc("lookup_team_invite", { p_token: token })

  if (error || !data) {
    console.error("Invite not found:", error?.message)
    return null
  }

  return {
    id: data.id,
    property_id: data.property_id,
    email: data.email,
    full_name: data.full_name || "",
    role: data.role as TeamMemberRole,
    permissions: normalizePermissions(data.permissions),
    status: "invited",
    created_at: data.created_at,
    property_name: data.property_name,
    location: data.location,
  } as PropertyMember & { property_name?: string; location?: string }
}

// ===== Current user's membership for a specific property (owner-aware) =====

export async function getMyMembershipForProperty(propertyId: string): Promise<{
  role: "owner" | TeamMemberRole
  permissions?: TeamPermissions
} | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Owner of the property?
  const { data: owned } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("landlord_id", user.id)
    .maybeSingle()
  if (owned) return { role: "owner" as const }

  // Active team member?
  const { data, error } = await supabase
    .from("property_members")
    .select("role, permissions")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (error || !data) return null // not an active member of this property
  return {
    role: data.role as TeamMemberRole,
    permissions: normalizePermissions(data.permissions),
  }
}

export const PENDING_INVITE_KEY = "rentify_pending_team_invite"

// ===== Accept an invite (creates/links the auth account + membership) =====

export async function acceptInvite(token: string): Promise<{ success: boolean; error?: string; role?: TeamMemberRole }> {
  const { data, error } = await supabase.rpc("accept_team_invite", { p_token: token })
  if (error) return { success: false, error: error.message }

  // RPC returns the role string when accepted, false otherwise
  if (typeof data === "string") return { success: true, role: data as TeamMemberRole }
  return { success: true }
}

// Complete a membership claim that was deferred while the invitee
// confirmed their email (used after login).
export async function completePendingInvite(): Promise<{ success: boolean; error?: string }> {
  const token = localStorage.getItem(PENDING_INVITE_KEY)
  if (!token) return { success: false, error: "No pending invite" }
  const result = await acceptInvite(token)
  if (result.success) {
    localStorage.removeItem(PENDING_INVITE_KEY)
    return { success: true }
  }
  return result
}