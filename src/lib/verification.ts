import { supabase } from "./supabase"
import type { LandlordVerification, CreateVerificationInput, VerificationQueueItem } from "../types/domain"

// ===== Landlord KYC Submission =====

// Upload KYC image to storage
export async function uploadKycImage(file: File, folder: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const fileExt = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const path = `${user.id}/${folder}/${fileName}`

  const { error } = await supabase.storage.from("kyc").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Store the storage path (not public URL) so we can generate signed URLs later
  return { success: true, url: path }
}

// Submit verification (landlord uploads ID front/back + selfie)
export async function submitVerification(input: CreateVerificationInput): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: existing } = await supabase
    .from("landlord_verifications")
    .select("id, status")
    .eq("landlord_id", user.id)
    .maybeSingle()

  if (existing && existing.status === "approved") {
    return { success: false, error: "Already verified" }
  }

  if (existing && existing.status === "pending") {
    const { error } = await supabase
      .from("landlord_verifications")
      .update({
        id_front_url: input.id_front_url,
        id_back_url: input.id_back_url,
        selfie_url: input.selfie_url,
        id_number: input.id_number,
        full_name: input.full_name,
        notes: input.notes,
        status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  const { error } = await supabase
    .from("landlord_verifications")
    .insert({
      landlord_id: user.id,
      id_front_url: input.id_front_url,
      id_back_url: input.id_back_url,
      selfie_url: input.selfie_url,
      id_number: input.id_number,
      full_name: input.full_name,
      notes: input.notes,
      status: "pending"
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get current user's verification status
export async function getMyVerification(): Promise<LandlordVerification | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .eq("landlord_id", user.id)
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch verification:", error.message)
    return null
  }

  return data as LandlordVerification | null
}

// ===== Signed URLs for private bucket access =====

// Generate a signed URL for a KYC image (valid for 1 hour)
// Works for both storage paths and legacy public URLs
export async function createSignedKycUrl(storagePathOrUrl: string): Promise<string | null> {
  try {
    // If it looks like a full URL, extract the storage path
    const storagePath = extractKycStoragePath(storagePathOrUrl)
    
    const pathToUse = storagePath || storagePathOrUrl
    
    const { data, error } = await supabase.storage
      .from("kyc")
      .createSignedUrl(pathToUse, 60 * 60) // 1 hour

    if (error) {
      console.error("Failed to create signed URL:", error.message)
      return null
    }
    return data.signedUrl
  } catch (err) {
    console.error("createSignedKycUrl error:", err)
    return null
  }
}

// Extract storage path from a public URL or full URL
// Handles: https://.../storage/v1/object/public/kyc/<path>
// Handles: https://.../storage/v1/object/sign/kyc/<path>
// Returns just the <path> part (e.g., "user-id/id-front/timestamp.jpg")
export function extractKycStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    const pathParts = u.pathname.split("/")
    const bucketIdx = pathParts.findIndex(p => p === "kyc")
    if (bucketIdx === -1) return null
    return pathParts.slice(bucketIdx + 1).join("/")
  } catch {
    return null
  }
}

// ===== Admin Verification Queue =====

// Get pending verifications for admin review
export async function getVerificationQueue(): Promise<VerificationQueueItem[]> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch verification queue:", error.message)
    return []
  }
  return (data ?? []) as VerificationQueueItem[]
}

// Approve/reject verification (admin)
export async function reviewVerification(
  verificationId: string,
  decision: "approved" | "rejected",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("review_verification", {
    p_verification_id: verificationId,
    p_decision: decision,
    p_reason: reason || null
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: "Failed to review verification" }
  }

  return { success: true }
}

// Get verifications with signed URLs for admin
export async function getVerificationQueueWithSignedUrls(): Promise<(VerificationQueueItem & { 
  id_front_signed_url?: string; 
  id_back_signed_url?: string; 
  selfie_signed_url?: string;
})[]> {
  const queue = await getVerificationQueue()
  
  const withSignedUrls = await Promise.all(queue.map(async (item) => {
    const [front, back, selfie] = await Promise.all([
      item.id_front_url ? createSignedKycUrl(item.id_front_url) : Promise.resolve(null),
      item.id_back_url ? createSignedKycUrl(item.id_back_url) : Promise.resolve(null),
      item.selfie_url ? createSignedKycUrl(item.selfie_url) : Promise.resolve(null),
    ])
    return {
      ...item,
      id_front_signed_url: front || undefined,
      id_back_signed_url: back || undefined,
      selfie_signed_url: selfie || undefined,
    }
  }))
  
  return withSignedUrls
}

// Get single verification with signed URLs for admin review
export async function getVerificationWithSignedUrls(id: string): Promise<(LandlordVerification & { 
  id_front_signed_url?: string; 
  id_back_signed_url?: string; 
  selfie_signed_url?: string;
}) | null> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Failed to fetch verification:", error?.message)
    return null
  }

  const [front, back, selfie] = await Promise.all([
    data.id_front_url ? createSignedKycUrl(data.id_front_url) : Promise.resolve(null),
    data.id_back_url ? createSignedKycUrl(data.id_back_url) : Promise.resolve(null),
    data.selfie_url ? createSignedKycUrl(data.selfie_url) : Promise.resolve(null),
  ])

  return {
    ...data,
    id_front_signed_url: front || undefined,
    id_back_signed_url: back || undefined,
    selfie_signed_url: selfie || undefined,
  } as any
}