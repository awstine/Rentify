import { supabase } from "../supabase"
import type { LoaderFunctionArgs } from "react-router-dom"
import type { Property, Room, PropertyUtility, RoomUtility } from "../../types/domain"
import { getTenantFromSession } from "../../lib/tenant-auth"
import { getPropertyUtilities, getRoomUtilitiesForProperty } from "../../lib/utilities"

export async function propertyJoinLoader({ params }: LoaderFunctionArgs) {
  const code = params.code
  if (!code) throw new Response("Invalid code", { status: 400 })

  const { data: propertyCode, error: codeError } = await supabase
    .from("property_codes")
    .select("*, properties(*)")
    .eq("code", code)
    .maybeSingle()

  if (codeError || !propertyCode) {
    throw new Response("Invalid or expired invitation code", { status: 404 })
  }

  if (!propertyCode.is_active) {
    throw new Response("This invitation code has been revoked", { status: 410 })
  }

  if (propertyCode.expires_at && new Date(propertyCode.expires_at) < new Date()) {
    throw new Response("This invitation code has expired", { status: 410 })
  }

  const property = propertyCode.properties as Property
  if (!property) {
    throw new Response("Property not found", { status: 404 })
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("property_id", property.id)
    .order("room_number", { ascending: true })

const [utilities, roomUtilities] = await Promise.all([
    getPropertyUtilities(property.id),
    getRoomUtilitiesForProperty(property.id),
  ])

  return {
    code: propertyCode.code,
    property,
    rooms: (rooms ?? []) as Room[],
    utilities: utilities as PropertyUtility[],
    roomUtilities: roomUtilities as Record<string, RoomUtility[]>,
  }
}

export async function roomJoinLoader({ params }: LoaderFunctionArgs) {
  const code = params.code
  if (!code) throw new Response("Invalid code", { status: 400 })

  const { data: roomCode, error: codeError } = await supabase
    .from("room_codes")
    .select("*, rooms(*, properties(*))")
    .eq("code", code)
    .maybeSingle()

  if (codeError || !roomCode) {
    throw new Response("Invalid or expired invitation code", { status: 404 })
  }

  const room = roomCode.rooms as any
  if (!room) {
    throw new Response("Room not found", { status: 404 })
  }

  const property = room.properties as any
  if (!property) {
    throw new Response("Property not found", { status: 404 })
  }

  // Check both Supabase auth (landlord) and tenant session
  const { data: { user } } = await supabase.auth.getUser()
  const tenant = await getTenantFromSession()
  
  const currentTenantId = tenant?.tenantId || user?.id

  const isAssignedToOther = roomCode.status === "assigned" && roomCode.tenant_id && roomCode.tenant_id !== currentTenantId
const [utilities, roomUtilities] = await Promise.all([
    getPropertyUtilities(property.id),
    getRoomUtilitiesForProperty(property.id),
  ])

  return {
    code: roomCode.code,
    room,
    property,
    roomCodeStatus: roomCode.status,
    isAuthenticated: !!user || !!tenant,
    user: user ?? tenant,
    isAssignedToOther,
    isAssignedToSelf: roomCode.tenant_id === currentTenantId,
    utilities: utilities as PropertyUtility[],
    roomUtilities: roomUtilities as Record<string, RoomUtility[]>,
  }
}
