import { supabase } from "./supabase"
import type {
  PropertyUtility,
  RoomUtility,
  CreateUtilityInput,
  RoomCostBreakdown,
  RoomCostLine,
  Room,
} from "../types/domain"

// ===== Property-level utility definitions (defaults for the building) =====

export async function getPropertyUtilities(propertyId: string): Promise<PropertyUtility[]> {
  const { data, error } = await supabase
    .from("property_utilities")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Failed to fetch property utilities:", error.message)
    return []
  }
  return (data ?? []) as PropertyUtility[]
}

export interface UtilityRow extends CreateUtilityInput {
  id?: string
}

// Replace the building's utility list. Keeps ids stable so room references survive.
export async function savePropertyUtilities(
  propertyId: string,
  items: UtilityRow[]
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const rows = items.map((item, index) => ({
    id: item.id || crypto.randomUUID(),
    property_id: propertyId,
    label: item.label.trim(),
    category: item.category,
    pricing_mode: item.pricing_mode,
    amount: Number(item.amount) || 0,
    unit_label: item.unit_label?.trim() || null,
    default_units: item.pricing_mode === "per_unit" ? Number(item.default_units) || 0 : null,
    is_optional: !!item.is_optional,
    sort_order: item.sort_order ?? index,
    is_active: true,
    updated_at: new Date().toISOString(),
  }))

  const { data: existing } = await supabase
    .from("property_utilities")
    .select("id")
    .eq("property_id", propertyId)

  const keepIds = new Set(rows.map((r) => r.id))
  const deleteIds = (existing ?? []).filter((e) => !keepIds.has(e.id)).map((e) => e.id)

  if (deleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from("property_utilities")
      .delete()
      .in("id", deleteIds)
    if (delErr) return { success: false, error: delErr.message }
  }

  const { error } = await supabase.from("property_utilities").upsert(rows, { onConflict: "id" })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ===== Per-room usage / rate overrides =====

export async function getRoomUtilities(roomId: string): Promise<RoomUtility[]> {
  const { data, error } = await supabase
    .from("room_utilities")
    .select("*")
    .eq("room_id", roomId)

  if (error) {
    console.error("Failed to fetch room utilities:", error.message)
    return []
  }
  return (data ?? []) as RoomUtility[]
}

// Get utilities for all rooms in a property, keyed by room_id (for bulk display)
export async function getRoomUtilitiesForProperty(propertyId: string): Promise<Record<string, RoomUtility[]>> {
  const { data, error } = await supabase
    .from("room_utilities")
    .select("*, rooms!inner(property_id)")
    .eq("rooms.property_id", propertyId)

  if (error) {
    console.error("Failed to fetch room utilities:", error.message)
    return {}
  }

  const map: Record<string, RoomUtility[]> = {}
  for (const item of data ?? []) {
    const roomId = (item as any).room_id
    if (!map[roomId]) map[roomId] = []
    map[roomId].push(item)
  }
  return map
}
// Upsert one room's usage/rate for a single utility
export async function saveRoomUtility(
  roomId: string,
  utilityId: string,
  values: { override_amount?: number | null; estimated_units?: number | null }
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data: existing } = await supabase
    .from("room_utilities")
    .select("id")
    .eq("room_id", roomId)
    .eq("utility_id", utilityId)
    .maybeSingle()

  const payload = {
    room_id: roomId,
    utility_id: utilityId,
    override_amount: values.override_amount ?? null,
    estimated_units: values.estimated_units ?? null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (existing) {
    const res = await supabase.from("room_utilities").update(payload).eq("id", existing.id)
    error = res.error
  } else {
    const res = await supabase
      .from("room_utilities")
      .insert({ ...payload, id: crypto.randomUUID() })
    error = res.error
  }

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Update a room's deposit amount (in months of rent)
export async function updateRoomDeposit(
  roomId: string,
  depositMonths: number
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("rooms")
    .update({ deposit_months: Number(depositMonths) || 1 })
    .eq("id", roomId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
// ===== Pure cost computation (used by tenant-facing join screens) =====

const fmt = (n: number) => "KES " + (Number.isFinite(n) ? n.toLocaleString() : "0")

export function computeRoomCostBreakdown(
  room: Room,
  utilities: PropertyUtility[],
  roomUtilities: RoomUtility[]
): RoomCostBreakdown {
  const rent = Number(room.monthly_rent) || 0
  const depositMonths = room.deposit_months != null ? Number(room.deposit_months) : 1
  const deposit = rent * (depositMonths >= 0 ? depositMonths : 1)
  const roomUtilByUtility = new Map(roomUtilities.map((ru) => [ru.utility_id, ru]))

  const monthlyLines: RoomCostLine[] = []
  const oneTimeLines: RoomCostLine[] = []
  let utilitiesTotal = 0
  let oneTimeTotal = 0

  for (const util of [...utilities].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    const ru = roomUtilByUtility.get(util.id)
    const rate = ru?.override_amount != null ? Number(ru.override_amount) : Number(util.amount) || 0

    if (util.category === "monthly") {
      if (util.pricing_mode === "flat") {
        const amount = rate
        monthlyLines.push({ label: util.label, amount, estimated: false, detail: `${fmt(amount)}/month`, perMonth: true })
        utilitiesTotal += amount
      } else {
        const units = ru?.estimated_units != null ? Number(ru.estimated_units) : Number(util.default_units) || 0
        const amount = rate * units
        const unitLabel = util.unit_label || "unit"
        monthlyLines.push({
          label: util.label,
          amount,
          estimated: true,
          detail: `${fmt(rate)}/${unitLabel} × approx ${units}`,
          perMonth: true,
        })
        utilitiesTotal += amount
      }
    } else {
      const amount = util.pricing_mode === "per_unit" ? rate * (Number(util.default_units) || 1) : rate
      oneTimeLines.push({ label: util.label, amount, estimated: false, perMonth: false })
      oneTimeTotal += amount
    }
  }

  return {
    monthly: {
      rent,
      lines: monthlyLines,
      utilitiesTotal,
      total: rent + utilitiesTotal,
    },
    moveIn: {
      deposit: deposit,
      firstMonth: rent,
      lines: oneTimeLines,
      oneTimeTotal,
      total: deposit + rent + oneTimeTotal,
    },
  }
}