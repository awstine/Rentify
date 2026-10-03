import { supabase } from "./supabase"
import type { PropertyListingQueueItem } from "../types/domain"

// Storage bucket that holds property photos. Keep this in sync with the bucket
// you created in Supabase (Storage > Buckets > New bucket).
export const PROPERTY_IMAGES_BUCKET = "property-images"

export interface CreatePropertyListingInput {
  name: string
  location: string
  description?: string
  rooms: { room_number: string; monthly_rent: number }[]
  imageUrls: string[]
}

export interface CreatePropertyListingResult {
  success: boolean
  propertyId?: string
  error?: string
}

// Upload a property photo to storage (private bucket + signed URLs, same as KYC)
export async function uploadPropertyImage(file: File): Promise<{ success: boolean; path?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You must be signed in to upload images" }

  if (!file.type.startsWith("image/")) return { success: false, error: "Please upload an image file" }
  if (file.size > 5 * 1024 * 1024) return { success: false, error: "Image must be less than 5MB" }

  const fileExt = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const path = `${user.id}/property-images/${fileName}`

  const { error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false })

  if (error) return { success: false, error: error.message }
  return { success: true, path }
}

// Signed URL for a stored property image (valid 1h). Legacy/public URLs pass through.
export async function createSignedPropertyImageUrl(path: string, expiresInSeconds = 60 * 60): Promise<string | null> {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const { data, error } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data) {
    console.error("Failed to create signed property image URL:", error?.message)
    return null
  }
  return data.signedUrl
}

// Create a property + units and submit it for admin approval (status = pending)
export async function createPropertyListing(input: CreatePropertyListingInput): Promise<CreatePropertyListingResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "You must be signed in to list a property" }

  const { data: newProperty, error: propertyError } = await supabase
    .from("properties")
    .insert({
      landlord_id: user.id,
      name: input.name.trim(),
      location: input.location.trim(),
      description: input.description?.trim() || null,
      image_urls: input.imageUrls,
      listing_status: "pending",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (propertyError) return { success: false, error: propertyError.message }

  if (input.rooms.length > 0) {
    const { error: roomsError } = await supabase.from("rooms").insert(
      input.rooms.map((room) => ({
        property_id: newProperty.id,
        room_number: room.room_number.trim(),
        monthly_rent: Number(room.monthly_rent),
        status: "available",
      }))
    )
    if (roomsError) return { success: false, error: roomsError.message, propertyId: newProperty.id }
  }

  return { success: true, propertyId: newProperty.id }
}

export type PropertyListingQueueItemWithImages = PropertyListingQueueItem & { image_signed_urls: string[] }

// Admin queue of pending listing requests (RPC is security-definer, returns landlord info too)
export async function getPropertyListingQueue(): Promise<{ queue: PropertyListingQueueItemWithImages[]; error?: string }> {
  const { data, error } = await supabase.rpc("get_property_listing_queue")
  if (error) return { queue: [], error: error.message }

  const queue = (data ?? []) as PropertyListingQueueItem[]

  const withImages = await Promise.all(
    queue.map(async (item) => ({
      ...item,
      image_signed_urls: (
        await Promise.all((item.image_urls || []).map((p) => createSignedPropertyImageUrl(p)))
      ).filter((u): u is string => !!u),
    }))
  )

  return { queue: withImages }
}

// Count of pending listings for the admin dashboard
// (used by adminDashboardLoader via a direct count query instead)

// Admin approve/reject (RPC is security-definer + admin-gated)
export async function reviewPropertyListing(
  propertyId: string,
  decision: "approved" | "rejected",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("review_property_listing", {
    p_property_id: propertyId,
    p_decision: decision,
    p_reason: reason || null,
  })

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: "Failed to review listing" }
  return { success: true }
}