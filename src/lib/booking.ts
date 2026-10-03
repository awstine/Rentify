import { supabase } from "./supabase"
import type { BookingRequest, Tenant } from "../types/domain"

// ===== OTP helpers =====
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  // TODO: Replace with real SMS provider (Africa's Talking, Termii, Beem, etc.)
  console.log(`[DEV SMS] To: ${phone} | Code: ${code}`)
  return true
}

// Create OTP record and send SMS
export async function createOtp(phone: string, purpose: "booking_verification" | "login"): Promise<{ success: boolean; error?: string }> {
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Clean old OTPs for this phone/purpose
  await supabase
    .from("tenant_otps")
    .delete()
    .eq("phone", phone)
    .eq("purpose", purpose)

  const { error } = await supabase.from("tenant_otps").insert({
    phone,
    code,
    purpose,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  await sendOtpSms(phone, code)
  return { success: true }
}

// Verify OTP
export async function verifyOtp(phone: string, code: string, purpose: "booking_verification" | "login"): Promise<{ success: boolean; error?: string }> {
  const { data: otp, error } = await supabase
    .from("tenant_otps")
    .select("*")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .eq("code", code)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (error || !otp) {
    return { success: false, error: "Invalid or expired OTP" }
  }

  // Mark consumed
  await supabase
    .from("tenant_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id)

  return { success: true }
}

// ===== Booking Requests =====

// Submit a booking request (after OTP verification)
export async function submitBookingRequest(
  propertyId: string,
  roomId: string,
  guestName: string,
  guestPhone: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  // Check if room is available
  const { data: room } = await supabase
    .from("rooms")
    .select("status")
    .eq("id", roomId)
    .maybeSingle()

  if (!room || room.status !== "available") {
    return { success: false, error: "Room is no longer available" }
  }

  // Check for existing pending request on this room
  const { data: existing } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("room_id", roomId)
    .in("status", ["pending_verification", "pending_approval"])
    .maybeSingle()

  if (existing) {
    return { success: false, error: "This room already has a pending request" }
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      property_id: propertyId,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: guestPhone,
      status: "pending_approval",
      phone_verified: true,
      otp_verified_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Flip room to PENDING
  await supabase
    .from("rooms")
    .update({ status: "pending" })
    .eq("id", roomId)

  // TODO: Send push notification to landlord
  return { success: true, requestId: data.id }
}

// Get booking requests for landlord (with property/room info)
export async function getLandlordBookingRequests(): Promise<BookingRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("booking_requests")
    .select(`
      *,
      properties!inner(name, location),
      rooms!inner(room_number, monthly_rent)
    `)
    .eq("properties.landlord_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch booking requests:", error.message)
    return []
  }
  return (data ?? []) as BookingRequest[]
}

// Approve booking request - uses atomic RPC
export async function approveBookingRequest(requestId: string): Promise<{ success: boolean; error?: string; tenantId?: string; leaseId?: string; invoiceId?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase.rpc("approve_booking_request_full", {
    p_request_id: requestId,
    p_landlord_id: user.id
  })

  if (error) {
    console.error("RPC error:", error.message)
    return { success: false, error: error.message }
  }

  const result = data as any
  if (!result?.success) {
    return { success: false, error: result?.error || "Approval failed" }
  }

  // Send approval SMS to tenant
  await sendApprovalSms(result.tenant_phone, result.property_name, result.room_number, result.monthly_rent)

  return { success: true, tenantId: result.tenant_id, leaseId: result.lease_id, invoiceId: result.invoice_id }
}

// Send approval SMS to tenant with login link
async function sendApprovalSms(phone: string, propertyName: string, roomNumber: string, monthlyRent: number): Promise<void> {
  const loginUrl = `${window.location.origin}/tenant/login`
  const message = `Your booking for Room ${roomNumber} at ${propertyName} (KES ${monthlyRent.toLocaleString()}/mo) was approved! Log in: ${loginUrl}`

  const { error } = await supabase.rpc("send_sms_via_at", { p_phone: phone, p_message: message })
  if (error) {
    console.error("Failed to send approval SMS:", error.message)
  }
}

// Reject booking request
export async function rejectBookingRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: request, error: reqError } = await supabase
    .from("booking_requests")
    .select(`
      *,
      properties!inner(landlord_id),
      rooms!inner(id)
    `)
    .eq("id", requestId)
    .maybeSingle()

  if (reqError || !request) {
    return { success: false, error: "Request not found" }
  }

  if ((request as any).properties.landlord_id !== user.id) {
    return { success: false, error: "Not authorized" }
  }

  if (request.status !== "pending_approval") {
    return { success: false, error: "Request cannot be rejected" }
  }

  await supabase
    .from("booking_requests")
    .update({ status: "rejected" })
    .eq("id", requestId)

  // Flip room back to available
  await supabase
    .from("rooms")
    .update({ status: "available" })
    .eq("id", (request as any).rooms.id)

  return { success: true }
}

// ===== Tenant Login (Phone + OTP) =====

// Request login OTP
export async function requestLoginOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  // Check if tenant exists
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("phone", phone)
    .maybeSingle()

  if (!tenant) {
    return { success: false, error: "No account found for this phone number" }
  }

  return createOtp(phone, "login")
}

// Verify login OTP and create session
export async function verifyLoginOtp(phone: string, code: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const result = await verifyOtp(phone, code, "login")
  if (!result.success) return result

  // Get tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("phone", phone)
    .maybeSingle()

  if (!tenant) {
    return { success: false, error: "Tenant not found" }
  }

  // Create session
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const { error } = await supabase
    .from("tenant_sessions")
    .insert({
      tenant_id: tenant.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, token }
}

// Get tenant from session token
export async function getTenantFromSession(token: string): Promise<Tenant | null> {
  const { data: session } = await supabase
    .from("tenant_sessions")
    .select("tenant_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", session.tenant_id)
    .maybeSingle()

  return tenant as Tenant | null
}

// Get tenant bookings/invoices (after login)
export async function getTenantLeases(tenantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(name, location), rooms(room_number)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant leases:", error.message)
    return []
  }
  return data ?? []
}

export async function getTenantInvoices(tenantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, leases(monthly_rent), properties(name), rooms(room_number)")
    .eq("tenant_id", tenantId)
    .order("period_start", { ascending: false })

  if (error) {
    console.error("Failed to fetch tenant invoices:", error.message)
    return []
  }
  return data ?? []
}

// Expire old pending requests (called by cron)
export async function expireOldBookingRequests(): Promise<number> {
  const { data, error } = await supabase.rpc("expire_booking_requests")
  if (error) {
    console.error("Failed to expire requests:", error.message)
    return 0
  }
  return data ?? 0
}
