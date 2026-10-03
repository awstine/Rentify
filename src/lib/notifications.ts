import { supabase } from "./supabase"

export type NotificationType = 
  | "payment_submitted"
  | "payment_approved"
  | "payment_rejected"
  | "verification_submitted"
  | "verification_approved"
  | "verification_rejected"
  | "listing_approved"
  | "listing_rejected"
  | "booking_request"
  | "booking_approved"
  | "booking_rejected"
  | "lease_created"
  | "maintenance_request"
  | "system"

export interface CreateNotificationInput {
  landlord_id: string
  type: NotificationType
  title: string
  message: string
  recipient_type?: "landlord" | "tenant" | "admin"
  recipient_id?: string
  related_entity_type?: "payment_submission" | "verification" | "booking_request" | "lease" | "property" | "room"
  related_entity_id?: string
}

// Create a notification for a landlord
export async function createLandlordNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert into notification_queue
    const { error } = await supabase
      .from("notification_queue")
      .insert({
        landlord_id: input.landlord_id,
        type: input.type,
        title: input.title,
        message: input.message,
        status: "pending",
        recipient_type: input.recipient_type || "landlord",
        recipient_id: input.recipient_id,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error("Failed to create notification:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error creating notification:", err)
    return { success: false, error: err.message }
  }
}

// Notify landlord of new payment submission
export async function notifyPaymentSubmitted(
  landlordId: string,
  tenantName: string,
  propertyName: string,
  roomNumber: string,
  amount: number,
  submissionId: string
): Promise<void> {
  await createLandlordNotification({
    landlord_id: landlordId,
    type: "payment_submitted",
    title: "New Payment Submitted",
    message: `${tenantName} submitted a payment of KES ${amount.toLocaleString()} for Room ${roomNumber} at ${propertyName}. Please review and approve.`,
    related_entity_type: "payment_submission",
    related_entity_id: submissionId
  })
}

// Notify landlord of payment approval
export async function notifyPaymentApproved(
  landlordId: string,
  tenantName: string,
  propertyName: string,
  roomNumber: string,
  amount: number,
  submissionId: string
): Promise<void> {
  await createLandlordNotification({
    landlord_id: landlordId,
    type: "payment_approved",
    title: "Payment Approved",
    message: `You approved the payment of KES ${amount.toLocaleString()} from ${tenantName} for Room ${roomNumber} at ${propertyName}.`,
    related_entity_type: "payment_submission",
    related_entity_id: submissionId
  })
}

// Notify landlord of payment rejection
export async function notifyPaymentRejected(
  landlordId: string,
  tenantName: string,
  propertyName: string,
  roomNumber: string,
  amount: number,
  reason: string | undefined,
  submissionId: string
): Promise<void> {
  await createLandlordNotification({
    landlord_id: landlordId,
    type: "payment_rejected",
    title: "Payment Rejected",
    message: `You rejected the payment of KES ${amount.toLocaleString()} from ${tenantName} for Room ${roomNumber} at ${propertyName}.${reason ? ` Reason: ${reason}` : ""}`,
    related_entity_type: "payment_submission",
    related_entity_id: submissionId
  })
}

// Notify tenant of payment approval (if we have tenant sessions)
export async function notifyTenantPaymentApproved(
  tenantId: string,
  propertyName: string,
  roomNumber: string,
  amount: number
): Promise<void> {
  await createLandlordNotification({
    landlord_id: "", // Not a landlord notification
    type: "payment_approved",
    title: "Payment Approved",
    message: `Your payment of KES ${amount.toLocaleString()} for Room ${roomNumber} at ${propertyName} has been approved by your landlord.`,
    recipient_type: "tenant",
    recipient_id: tenantId,
    related_entity_type: "payment_submission",
    related_entity_id: ""
  })
}

// Notify tenant of payment rejection
export async function notifyTenantPaymentRejected(
  tenantId: string,
  propertyName: string,
  roomNumber: string,
  amount: number,
  reason: string | undefined
): Promise<void> {
  await createLandlordNotification({
    landlord_id: "",
    type: "payment_rejected",
    title: "Payment Rejected",
    message: `Your payment of KES ${amount.toLocaleString()} for Room ${roomNumber} at ${propertyName} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    recipient_type: "tenant",
    recipient_id: tenantId,
    related_entity_type: "payment_submission",
    related_entity_id: ""
  })
}

// Get landlord notifications
export async function getLandlordNotifications(
  landlordId: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch notifications:", error.message)
    return []
  }
  return data ?? []
}

// Mark notification as read/sent
export async function markNotificationSent(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("notification_queue")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", notificationId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
