import QRCode from "qrcode"
import { supabase } from "./supabase"
import type { PropertyCode, RoomCode, CreatePropertyCodeInput, CreateRoomCodeInput } from "../types/domain"

// Build a URL that the QR will encode
export function buildPropertyCodeUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/join/property/${code}`
}

export function buildRoomCodeUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/join/room/${code}`
}

// Generate a QR data URL for a given payload
export async function generateQrDataUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, { width: 320, margin: 2 })
  } catch (error) {
    console.error("Failed to generate QR code:", error)
    return ""
  }
}

// Property codes - using Supabase RPC (get or create for stable codes)
export async function createPropertyCode(input: CreatePropertyCodeInput): Promise<PropertyCode | null> {
  const { data, error } = await supabase.rpc("get_or_create_property_code", {
    p_property_id: input.property_id,
    p_label: input.label,
    p_expires_at: input.expires_at,
  })

  if (error || !data) {
    console.error("Failed to get/create property code:", error?.message)
    return null
  }

  const code = data as PropertyCode
  const joinUrl = buildPropertyCodeUrl(code.code)
  const qrCodeUrl = await generateQrDataUrl(joinUrl)

  // Update the code with the QR URL
  await supabase
    .from("property_codes")
    .update({ qr_code_url: qrCodeUrl || joinUrl })
    .eq("id", code.id)

  return { ...code, qr_code_url: qrCodeUrl || joinUrl }
}

export async function getPropertyCodes(propertyId: string): Promise<PropertyCode[]> {
  const { data, error } = await supabase
    .from("property_codes")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch property codes:", error.message)
    return []
  }

  return (data ?? []) as PropertyCode[]
}

export async function createRoomCode(input: CreateRoomCodeInput): Promise<RoomCode | null> {
  const { data, error } = await supabase.rpc("get_or_create_room_code", {
    p_room_id: input.room_id,
  })

  if (error || !data) {
    console.error("Failed to get/create room code:", error?.message)
    return null
  }

  const code = data as RoomCode
  const joinUrl = buildRoomCodeUrl(code.code)
  const qrCodeUrl = await generateQrDataUrl(joinUrl)

  await supabase
    .from("room_codes")
    .update({ qr_code_url: qrCodeUrl || joinUrl })
    .eq("id", code.id)

  return { ...code, qr_code_url: qrCodeUrl || joinUrl }
}

export async function assignRoomCode(code: string, tenantId: string): Promise<boolean> {
  const { error } = await supabase
    .from("room_codes")
    .update({ tenant_id: tenantId, status: "assigned", assigned_at: new Date().toISOString() })
    .eq("code", code)

  if (error) {
    console.error("Failed to assign room code:", error.message)
    return false
  }

  return true
}
