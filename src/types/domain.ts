export type RoomStatus = "available" | "pending" | "reserved" | "occupied" | "maintenance"

export interface Room {
  id: string
  property_id: string
  room_number: string
  monthly_rent: number
deposit_months?: number
  status: RoomStatus
  tenant_id?: string
  lease_start?: string
  lease_end?: string
  created_at?: string
}

// Property listing approval workflow
export type PropertyListingStatus = "pending" | "approved" | "rejected"

export interface PropertyListingQueueItem {
  id: string
  landlord_id: string
  property_name: string
  location: string
  description?: string
  image_urls: string[]
  submitted_at: string
  unit_count: number
  available_count: number
  min_rent?: number
  max_rent?: number
  landlord_full_name?: string
  landlord_id_number?: string
  landlord_kyc_status?: string
  landlord_email?: string
  landlord_phone?: string
}

export interface Property {
  id: string
  landlord_id: string
  name: string
  location: string
  created_at?: string
  rooms?: Room[]
  listing_status?: PropertyListingStatus
  description?: string
  image_urls?: string[]
  submitted_at?: string
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
  listed_at?: string
}

// Invitation / QR codes
export interface PropertyCode {
  id: string
  property_id: string
  code: string
  qr_code_url?: string
  label?: string
  is_active: boolean
  expires_at?: string
  created_at: string
}

export interface RoomCode {
  id: string
  room_id: string
  code: string
  qr_code_url?: string
  tenant_id?: string
  status: "available" | "assigned" | "revoked"
  created_at: string
  assigned_at?: string
}

export interface CreatePropertyCodeInput {
  property_id: string
  label?: string
  expires_at?: string
}

export interface CreateRoomCodeInput {
  room_id: string
}

// Booking requests
export type BookingRequestStatus = "pending_verification" | "pending_approval" | "approved" | "rejected" | "expired"

export interface BookingRequest {
  id: string
  property_id: string
  room_id: string
  guest_name: string
  guest_phone: string
  status: BookingRequestStatus
  phone_verified: boolean
  otp_verified_at?: string
  expires_at: string
  created_at: string
  updated_at: string
  properties?: Property
  rooms?: Room
}

// Tenant profiles (phone-only, no auth.users)
export interface Tenant {
  id: string
  full_name: string
  phone: string
  email?: string
  id_number?: string
  kra_pin?: string
  created_at: string
  updated_at: string
}

// OTP verification
export interface TenantOtp {
  id: string
  phone: string
  code: string
  purpose: "booking_verification" | "login"
  expires_at: string
  attempts: number
  consumed_at?: string
  created_at: string
}

// Tenant sessions
export interface TenantSession {
  id: string
  tenant_id: string
  token: string
  expires_at: string
  created_at: string
}

// Landlord KYC Verification
export type VerificationStatus = "pending" | "approved" | "rejected" | "more_info"

export interface LandlordVerification {
  id: string
  landlord_id: string
  status: VerificationStatus
  id_front_url?: string
  id_back_url?: string
  selfie_url?: string
  id_number?: string
  full_name?: string
  notes?: string
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface CreateVerificationInput {
  id_front_url: string
  id_back_url: string
  selfie_url: string
  id_number: string
  full_name: string
  notes?: string
}

export interface VerificationQueueItem {
  id: string
  landlord_id: string
  status: VerificationStatus
  full_name?: string
  id_number?: string
  id_front_url?: string
  id_back_url?: string
  selfie_url?: string
  created_at: string
}

// Lease workflow
export type LeaseStatus = "draft" | "pending_tenant" | "pending_landlord" | "active" | "expired" | "terminated" | "rejected"

export interface Lease {
  id: string
  property_id: string
  room_id: string
  landlord_id: string
  tenant_id: string
  monthly_rent: number
  deposit: number
  start_date: string
  end_date: string
  late_fee_percent: number
  notice_days: number
  terms: string
  status: LeaseStatus
  landlord_signed_at?: string
  tenant_signed_at?: string
  created_at: string
  updated_at: string
  auto_generate_invoice?: boolean
}

export interface LeaseSignature {
  id: string
  lease_id: string
  user_id: string
  role: "landlord" | "tenant"
  signed_at: string
  ip_address?: string
  user_agent?: string
}

export interface CreateLeaseInput {
  property_id: string
  room_id: string
  tenant_id: string
  monthly_rent: number
  deposit: number
  start_date: string
  end_date: string
  late_fee_percent: number
  notice_days: number
  terms?: string
}

export interface Invoice {
  id: string
  lease_id: string
  property_id: string
  room_id: string
  tenant_id: string
  period_start: string
  period_end: string
  amount: number
  status: "pending" | "paid" | "overdue" | "partial"
  due_date: string
  paid_at?: string
  payment_ref?: string
  credit_applied: number
  created_at: string
  updated_at: string
}

// ===== NEW: Payment & Settings Types =====

export interface PropertyPaymentSettings {
  id: string
  property_id: string
  paybill_number?: string
  till_number?: string
  account_reference: string
  created_at: string
  updated_at: string
}

export interface CreatePropertyPaymentSettingsInput {
  property_id: string
  paybill_number?: string
  till_number?: string
  account_reference: string
}

export type PaymentSubmissionStatus = "pending" | "approved" | "rejected"

export interface PaymentSubmission {
  id: string
  tenant_id: string
  property_id: string
  room_id?: string
  lease_id?: string
  amount: number
  mpesa_code: string
  phone_number: string
  status: PaymentSubmissionStatus
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface CreatePaymentSubmissionInput {
  tenant_id: string
  property_id: string
  room_id?: string
  lease_id?: string
  amount: number
  mpesa_code: string
  phone_number: string
}

// Tenant credit ledger entry
export interface TenantCreditEntry {
  id: string
  tenant_id: string
  amount: number          // positive = credit added, negative = credit consumed
  reason?: string
  created_at: string
}

export interface TenantCreditBalance {
  tenant_id: string
  balance: number         // positive = available credit
}
// ===== Utility / cost configuration =====

// Category: monthly recurring cost or one-time move-in cost
export type UtilityCategory = "monthly" | "one_time"

// flat = fixed amount (e.g. garbage KES 300/mo)
// per_unit = rate per unit (e.g. water KES 200/unit) — tenant sees estimated usage
export type UtilityPricingMode = "flat" | "per_unit"

export interface PropertyUtility {
  id: string
  property_id: string
  label: string                      // e.g. "Water", "Garbage", "Agency fee"
  category: UtilityCategory
  pricing_mode: UtilityPricingMode
  amount: number                     // flat: cost; per_unit: rate per unit
  unit_label?: string                // e.g. "unit", "m³"
  default_units?: number             // typical monthly usage for per_unit estimates
  is_optional: boolean
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Room-level override for a property utility (usage / rate override)
export interface RoomUtility {
  id: string
  room_id: string
  utility_id: string
  override_amount?: number           // optional per-room rate override
  estimated_units?: number           // this room's typical usage
  utility?: PropertyUtility
  created_at?: string
  updated_at?: string
}

export interface CreateUtilityInput {
  label: string
  category: UtilityCategory
  pricing_mode: UtilityPricingMode
  amount: number
  unit_label?: string
  default_units?: number
  is_estimated?: boolean
  is_optional?: boolean
  sort_order?: number
}

// What a tenant sees for a specific room
export interface RoomCostLine {
  label: string
  amount: number                     // monthly (recurring) or one-time cost
  estimated: boolean                 // per-unit costs are estimates
  detail?: string                    // e.g. "KES 200/unit × ~3 units"
  perMonth?: boolean
}

export interface RoomCostBreakdown {
  monthly: {
    rent: number
    lines: RoomCostLine[]            // recurring utilities
    utilitiesTotal: number
    total: number                     // rent + recurring utilities
  }
  moveIn: {
    deposit: number                   // rent × deposit_months
    firstMonth: number                // rent
    lines: RoomCostLine[]             // one-time fees
    oneTimeTotal: number
    total: number                     // deposit + first month + one-time fees
  }
}
// ===== Team members (agents & caretakers) =====

export type TeamMemberRole = "agent" | "caretaker"

export type TeamMemberStatus = "invited" | "active" | "removed"

export interface TeamPermissions {
  view_property: boolean        // part of the room/availability view
  manage_bookings: boolean      // agent: approve/reject booking requests
  handle_maintenance: boolean   // caretaker: maintenance requests
  edit_utilities: boolean       // change utility rates / usage / deposit
  record_payments: boolean      // caretaker: log received cash payments
  view_finances: boolean        // paybill/till, invoices, earnings
  manage_team: boolean          // add/remove other team members
}

export const DEFAULT_AGENT_PERMISSIONS: TeamPermissions = {
  view_property: true,
  manage_bookings: true,
  handle_maintenance: false,
  edit_utilities: false,
  record_payments: false,
  view_finances: false,
  manage_team: false,
}

export const DEFAULT_CARETAKER_PERMISSIONS: TeamPermissions = {
  view_property: true,
  manage_bookings: false,
  handle_maintenance: true,
  edit_utilities: false,
  record_payments: true,
  view_finances: false,
  manage_team: false,
}

export function defaultPermissionsForRole(role: TeamMemberRole): TeamPermissions {
  return role === "agent" ? { ...DEFAULT_AGENT_PERMISSIONS } : { ...DEFAULT_CARETAKER_PERMISSIONS }
}

export interface PropertyMember {
  id: string
  property_id: string
  user_id?: string
  email: string
  full_name?: string
  phone_number?: string
  role: TeamMemberRole
  permissions: TeamPermissions
  status: TeamMemberStatus
  invite_token?: string
  invited_by?: string
  created_at: string
  updated_at?: string
}

export interface CreateTeamMemberInput {
  full_name: string
  email: string
  phone_number?: string
  role: TeamMemberRole
  permissions: TeamPermissions
}
