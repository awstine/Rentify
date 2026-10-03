import { supabase } from "./supabase"
import type { 
  PropertyPaymentSettings, 
  CreatePropertyPaymentSettingsInput,
  PaymentSubmission,
  CreatePaymentSubmissionInput,
  TenantCreditEntry,
  TenantCreditBalance
} from "../types/domain"
import { 
  notifyPaymentSubmitted, 
  notifyPaymentApproved, 
  notifyPaymentRejected 
} from "./notifications"

// ===== Property Payment Settings =====

export async function getPropertyPaymentSettings(
  propertyId: string
): Promise<PropertyPaymentSettings | null> {
  const { data, error } = await supabase
    .from("property_payment_settings")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch payment settings:", error.message)
    return null
  }
  return data as PropertyPaymentSettings | null
}

export async function upsertPropertyPaymentSettings(
  input: CreatePropertyPaymentSettingsInput
): Promise<{ success: boolean; error?: string; data?: PropertyPaymentSettings }> {
  const { data, error } = await supabase
    .from("property_payment_settings")
    .upsert({
      property_id: input.property_id,
      paybill_number: input.paybill_number,
      till_number: input.till_number,
      account_reference: input.account_reference,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, data: data as PropertyPaymentSettings }
}

// Get payment settings for multiple properties (e.g., for landlord dashboard)
export async function getAllPropertyPaymentSettings(
  landlordId: string
): Promise<PropertyPaymentSettings[]> {
  const { data, error } = await supabase
    .from("property_payment_settings")
    .select(`
      *,
      properties!inner(landlord_id)
    `)
    .eq("properties.landlord_id", landlordId)

  if (error) {
    console.error("Failed to fetch all payment settings:", error.message)
    return []
  }
  return (data ?? []) as PropertyPaymentSettings[]
}

// ===== Payment Submissions (Tenant submits M-PESA payment) =====

export async function createPaymentSubmission(
  input: CreatePaymentSubmissionInput
): Promise<{ success: boolean; error?: string; data?: PaymentSubmission }> {
  const { data, error } = await supabase
    .from("payment_submissions")
    .insert({
      tenant_id: input.tenant_id,
      property_id: input.property_id,
      room_id: input.room_id,
      lease_id: input.lease_id,
      amount: input.amount,
      mpesa_code: input.mpesa_code,
      phone_number: input.phone_number,
      status: "pending"
    })
    .select(`
      *,
      properties!inner(landlord_id, name),
      tenants(full_name)
    `)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Notify landlord of new payment submission
  if (data) {
    await notifyPaymentSubmitted(
      data.properties.landlord_id,
      data.tenants?.full_name || "A tenant",
      data.properties.name,
      "", // room number would need to be fetched
      data.amount,
      data.id
    )
  }

  return { success: true, data: data as PaymentSubmission }
}

// Landlord: Get pending payment submissions for their properties
export async function getLandlordPaymentSubmissions(
  landlordId: string,
  status?: "pending" | "approved" | "rejected"
): Promise<PaymentSubmission[]> {
  let query = supabase
    .from("payment_submissions")
    .select(`
      *,
      tenants(full_name, phone),
      properties(name, location, landlord_id),
      rooms(room_number)
    `)
    .eq("properties.landlord_id", landlordId)
    .order("submitted_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch payment submissions:", error.message)
    return []
  }
  return (data ?? []) as PaymentSubmission[]
}

// Landlord: Approve or reject a payment submission
export async function reviewPaymentSubmission(
  submissionId: string,
  decision: "approved" | "rejected",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Fetch submission details for notifications
  const { data: submission, error: fetchError } = await supabase
    .from("payment_submissions")
    .select(`
      *,
      properties!inner(landlord_id, name),
      tenants(full_name, id),
      rooms(room_number)
    `)
    .eq("id", submissionId)
    .single()

  if (fetchError || !submission) {
    return { success: false, error: "Payment submission not found" }
  }

  // Verify landlord owns this property
  if (submission.properties.landlord_id !== user.id) {
    return { success: false, error: "Not authorized to review this payment" }
  }

  if (decision === "approved") {
    // Apply payment to invoices and credit ledger
    const { error: applyError } = await supabase.rpc("apply_payment_to_invoices", {
      p_tenant_id: submission.tenant_id,
      p_amount: submission.amount,
      p_payment_submission_id: submissionId
    })

    if (applyError) {
      return { success: false, error: applyError.message }
    }
  }

  const { error } = await supabase
    .from("payment_submissions")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: decision === "rejected" ? reason : null
    })
    .eq("id", submissionId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Send notifications
  if (decision === "approved") {
    await notifyPaymentApproved(
      user.id,
      submission.tenants?.full_name || "Tenant",
      submission.properties.name,
      submission.rooms?.room_number || "",
      submission.amount,
      submissionId
    )
  } else {
    await notifyPaymentRejected(
      user.id,
      submission.tenants?.full_name || "Tenant",
      submission.properties.name,
      submission.rooms?.room_number || "",
      submission.amount,
      reason,
      submissionId
    )
  }

  return { success: true }
}

// Tenant: Get their own payment submissions
export async function getTenantPaymentSubmissions(
  tenantId: string
): Promise<PaymentSubmission[]> {
  const { data, error } = await supabase
    .from("payment_submissions")
    .select(`
      *,
      properties(name, location),
      rooms(room_number)
    `)
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant payment submissions:", error.message)
    return []
  }
  return (data ?? []) as PaymentSubmission[]
}

// ===== Tenant Credit Ledger =====

export async function getTenantCreditBalance(
  tenantId: string
): Promise<TenantCreditBalance> {
  const { data, error } = await supabase.rpc("get_tenant_credit", {
    p_tenant_id: tenantId
  })

  if (error) {
    console.error("Failed to fetch tenant credit:", error.message)
    return { tenant_id: tenantId, balance: 0 }
  }
  return { tenant_id: tenantId, balance: data ?? 0 }
}

export async function getTenantCreditHistory(
  tenantId: string
): Promise<TenantCreditEntry[]> {
  const { data, error } = await supabase
    .from("tenant_credits")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant credit history:", error.message)
    return []
  }
  return (data ?? []) as TenantCreditEntry[]
}

// ===== Invoice Auto-Generation (called by pg_cron) =====

export async function generateMonthlyInvoices(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_monthly_invoices")
  if (error) {
    console.error("Failed to generate monthly invoices:", error.message)
    return 0
  }
  return data ?? 0
}

// ===== Helper: Format KES amount =====

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// ===== Helper: Parse payment settings for display =====

export function getPaymentInstructions(settings: PropertyPaymentSettings | null): {
  paybill?: string
  till?: string
  accountRef: string
} {
  return {
    paybill: settings?.paybill_number,
    till: settings?.till_number,
    accountRef: settings?.account_reference || "—"
  }
}
