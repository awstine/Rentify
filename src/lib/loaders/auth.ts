import { supabase } from "../supabase"
import { redirect } from "react-router-dom"
import { getRoleForUser, getVerificationStatus } from "../../lib/role"
import { getMyMemberProperties } from "../../lib/team"

function extractNameFromEmail(email: string): string {
  const prefix = email.split("@")[0]
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, " ")
}

export async function appLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const role = await getRoleForUser(user.id)
  if (role !== "landlord" && role !== "agent" && role !== "caretaker") {
    throw redirect("/login")
  }

  const verificationStatus = await getVerificationStatus(user.id)
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()
  
  const email = profile?.email || user.email || "landlord@rentify.co.ke"
  const userName = profile?.full_name || extractNameFromEmail(email)
  const isStaffRole = role === "agent" || role === "caretaker"
  const isVerified = isStaffRole || verificationStatus === "approved"

  // Staff members: pull their per-property permissions so nav/tabs can honor them
  const memberships = isStaffRole ? await getMyMemberProperties() : []

  return { 
    userEmail: email,
    userName,
    role,
    memberships,
    verificationStatus,
    isVerified
  }
}

export async function tenantLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const role = await getRoleForUser(user.id)
  if (role !== "tenant") {
    throw redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, email, phone_number").eq("id", user.id).single()
  const email = profile?.email || user.email || "tenant@rentify.co.ke"
  const userName = profile?.full_name || extractNameFromEmail(email)
  return { userEmail: email, userName }
}

export async function adminLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect("/login")

  const role = await getRoleForUser(user.id)
  if (role !== "admin") {
    throw redirect("/landlord/properties")
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()
  const email = profile?.email || user.email || "admin@rentify.co.ke"
  const userName = profile?.full_name || extractNameFromEmail(email)
  return { userEmail: email, userName }
}
