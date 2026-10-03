import { supabase } from "./supabase"
import type { Lease, CreateLeaseInput, Invoice } from "../types/domain"

// Create a new lease (landlord initiates)
export async function createLease(input: CreateLeaseInput): Promise<Lease | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("leases")
    .insert({
      property_id: input.property_id,
      room_id: input.room_id,
      landlord_id: user.id,
      tenant_id: input.tenant_id,
      monthly_rent: input.monthly_rent,
      deposit: input.deposit,
      start_date: input.start_date,
      end_date: input.end_date,
      late_fee_percent: input.late_fee_percent,
      notice_days: input.notice_days,
      terms: input.terms,
      status: "pending_tenant",
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create lease:", error.message)
    return null
  }
  return data as Lease
}

// Get leases for landlord
export async function getLandlordLeases(): Promise<Lease[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number)")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch leases:", error.message)
    return []
  }
  return (data ?? []) as Lease[]
}

// Get leases for tenant
export async function getTenantLeases(): Promise<Lease[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number)")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant leases:", error.message)
    return []
  }
  return (data ?? []) as Lease[]
}

// Get single lease with full details
export async function getLeaseById(leaseId: string): Promise<Lease | null> {
  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number, monthly_rent)")
    .eq("id", leaseId)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch lease:", error.message)
    return null
  }
  return data as Lease
}

// Landlord signs lease
export async function signLeaseAsLandlord(leaseId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from("leases")
    .update({
      landlord_signed_at: new Date().toISOString(),
      status: "pending_tenant",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaseId)
    .eq("landlord_id", user.id)

  if (error) {
    console.error("Failed to sign lease:", error.message)
    return false
  }

  // Record signature
  await supabase.from("lease_signatures").insert({
    lease_id: leaseId,
    user_id: user.id,
    role: "landlord",
  })

  return true
}

// Tenant signs lease (with OTP verification - placeholder)
export async function signLeaseAsTenant(leaseId: string, otp?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // TODO: Verify OTP here
  if (otp && otp !== "123456") { // placeholder OTP check
    throw new Error("Invalid OTP")
  }

  const { error } = await supabase
    .from("leases")
    .update({
      tenant_signed_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaseId)
    .eq("tenant_id", user.id)

  if (error) {
    console.error("Failed to sign lease:", error.message)
    return false
  }

  // Record signature
  await supabase.from("lease_signatures").insert({
    lease_id: leaseId,
    user_id: user.id,
    role: "tenant",
  })

  // Update room status to occupied
  const { data: lease } = await supabase
    .from("leases")
    .select("room_id")
    .eq("id", leaseId)
    .single()

  if (lease) {
    await supabase
      .from("rooms")
      .update({ status: "occupied", tenant_id: user.id, lease_start: new Date().toISOString().split("T")[0] })
      .eq("id", lease.room_id)
  }

  return true
}

// Tenant requests changes
export async function requestLeaseChanges(leaseId: string, message: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from("leases")
    .update({
      status: "pending_landlord",
      terms: message, // store requested changes in terms for now
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaseId)
    .eq("tenant_id", user.id)

  if (error) {
    console.error("Failed to request changes:", error.message)
    return false
  }
  return true
}

// Get invoices for lease
export async function getInvoicesForLease(leaseId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("lease_id", leaseId)
    .order("period_start", { ascending: false })

  if (error) {
    console.error("Failed to fetch invoices:", error.message)
    return []
  }
  return (data ?? []) as Invoice[]
}

// Get invoices for tenant
export async function getTenantInvoices(): Promise<Invoice[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("invoices")
    .select("*, leases(monthly_rent), properties(name), rooms(room_number)")
    .eq("tenant_id", user.id)
    .order("period_start", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant invoices:", error.message)
    return []
  }
  return (data ?? []) as Invoice[]
}

// Get invoices for landlord
export async function getLandlordInvoices(): Promise<Invoice[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("invoices")
    .select("*, leases(monthly_rent), properties(name), rooms(room_number), profiles:tenant_id(full_name, email, phone_number)")
    .eq("properties.landlord_id", user.id)
    .order("period_start", { ascending: false })

  if (error) {
    console.error("Failed to fetch landlord invoices:", error.message)
    return []
  }
  return (data ?? []) as Invoice[]
}

// Pay invoice with optional pay-ahead (covers N months from period_start)
export async function payInvoice(invoiceId: string, monthsAhead: number = 1): Promise<{ success: boolean; paidThrough?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Get invoice with lease info
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("*, leases!inner(monthly_rent, tenant_id, start_date, end_date)")
    .eq("id", invoiceId)
    .single()

  if (invError || !invoice) {
    return { success: false, error: "Invoice not found" }
  }

  // Verify tenant owns this invoice
  if (invoice.tenant_id !== user.id) {
    return { success: false, error: "Not authorized" }
  }

  const lease = invoice.leases as any
  const monthlyRent = Number(lease.monthly_rent)
  const totalAmount = monthlyRent * monthsAhead

  // Calculate paid_through date: period_start + monthsAhead months - 1 day
  const periodStart = new Date(invoice.period_start)
  const paidThrough = new Date(periodStart)
  paidThrough.setMonth(paidThrough.getMonth() + monthsAhead)
  paidThrough.setDate(paidThrough.getDate() - 1)

  // Don't exceed lease end date
  const leaseEnd = new Date(lease.end_date)
  if (paidThrough > leaseEnd) {
    paidThrough.setTime(leaseEnd.getTime())
  }

  const paidThroughStr = paidThrough.toISOString().split("T")[0]

  // Update invoice: mark paid, set paid_through, paid_at
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_through: paidThroughStr,
      amount: totalAmount, // reflect total paid
    })
    .eq("id", invoiceId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // If paying ahead, create "paid" invoice placeholders for future months
  // so they appear in history but don't need payment
  for (let i = 1; i < monthsAhead; i++) {
    const futurePeriodStart = new Date(periodStart)
    futurePeriodStart.setMonth(futurePeriodStart.getMonth() + i)
    const futurePeriodEnd = new Date(futurePeriodStart)
    futurePeriodEnd.setMonth(futurePeriodEnd.getMonth() + 1)
    futurePeriodEnd.setDate(futurePeriodEnd.getDate() - 1)
    const futureDueDate = new Date(futurePeriodStart)
    futureDueDate.setDate(futureDueDate.getDate() + 4) // 5th of month

    if (futurePeriodStart > leaseEnd) break

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("lease_id", invoice.lease_id)
      .eq("period_start", futurePeriodStart.toISOString().split("T")[0])
      .maybeSingle()

    if (!existing) {
      await supabase.from("invoices").insert({
        lease_id: invoice.lease_id,
        property_id: invoice.property_id,
        room_id: invoice.room_id,
        tenant_id: invoice.tenant_id,
        period_start: futurePeriodStart.toISOString().split("T")[0],
        period_end: futurePeriodEnd.toISOString().split("T")[0],
        amount: monthlyRent,
        status: "paid",
        due_date: futureDueDate.toISOString().split("T")[0],
        paid_at: new Date().toISOString(),
        paid_through: futurePeriodEnd.toISOString().split("T")[0],
      })
    }
  }

  return { success: true, paidThrough: paidThroughStr }
}

// Generate monthly invoices for active leases (called by cron/edge function)
export async function generateMonthlyInvoices(): Promise<{ created: number; errors: string[] }> {
  const { data: activeLeases, error: leaseError } = await supabase
    .from("leases")
    .select("id, property_id, room_id, tenant_id, monthly_rent, start_date, end_date, auto_generate_invoice")
    .eq("status", "active")
    .eq("auto_generate_invoice", true)

  if (leaseError) {
    return { created: 0, errors: [leaseError.message] }
  }

  const now = new Date()
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 5) // 5th of month

  const errors: string[] = []
  let created = 0

  for (const lease of activeLeases ?? []) {
    const leaseStart = new Date(lease.start_date)
    const leaseEnd = new Date(lease.end_date)

    // Only generate if lease is active for this period
    if (currentPeriodStart >= leaseStart && currentPeriodStart <= leaseEnd) {
      // Check if invoice already exists for this period
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("lease_id", lease.id)
        .eq("period_start", currentPeriodStart.toISOString().split("T")[0])
        .maybeSingle()

      if (!existing) {
        const { error } = await supabase.from("invoices").insert({
          lease_id: lease.id,
          property_id: lease.property_id,
          room_id: lease.room_id,
          tenant_id: lease.tenant_id,
          period_start: currentPeriodStart.toISOString().split("T")[0],
          period_end: currentPeriodEnd.toISOString().split("T")[0],
          amount: lease.monthly_rent,
          status: "pending",
          due_date: dueDate.toISOString().split("T")[0],
        })

        if (error) {
          errors.push(`Lease ${lease.id}: ${error.message}`)
        } else {
          created++
        }
      }
    }
  }

  return { created, errors }
}

// Get lease settings
export async function getLeaseSettings(leaseId: string): Promise<{
  auto_generate_invoice: boolean
  enable_late_fee: boolean
  send_reminders: boolean
  allow_pay_ahead: boolean
  auto_apply_wallet: boolean
} | null> {
  const { data, error } = await supabase
    .from("leases")
    .select("auto_generate_invoice, enable_late_fee, send_reminders, allow_pay_ahead, auto_apply_wallet")
    .eq("id", leaseId)
    .maybeSingle()

  if (error || !data) return null
  return data as any
}

// Update lease settings
export async function updateLeaseSettings(leaseId: string, settings: {
  auto_generate_invoice?: boolean
  enable_late_fee?: boolean
  send_reminders?: boolean
  allow_pay_ahead?: boolean
  auto_apply_wallet?: boolean
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from("leases")
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaseId)
    .eq("landlord_id", user.id)

  if (error) {
    console.error("Failed to update lease settings:", error.message)
    return false
  }
  return true
}
