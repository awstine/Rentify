import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react"
import type { Room, RoomUtility } from "../types/domain"
import {
  getPropertyUtilities,
  getRoomUtilitiesForProperty,
  savePropertyUtilities,
  saveRoomUtility,
  updateRoomDeposit,
  type UtilityRow,
} from "../lib/utilities"

interface Props {
  propertyId: string
  rooms: Room[]
}

const CATEGORY_OPTIONS = [
  { value: "monthly", label: "Monthly / recurring" },
  { value: "one_time", label: "One-time / move-in" },
] as const

const PRICING_OPTIONS = [
  { value: "flat", label: "Flat amount" },
  { value: "per_unit", label: "Per unit" },
] as const

const PRESET_LABELS = [
  "Rent", "Water", "Electricity", "Garbage", "Security", "Service charge",
  "Parking", "Internet", "Meter deposit", "Agency fee", "Cleaning",
]

// ===== Small UI atoms =====
function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-slate-600">{children}</label>
}

const inputCls = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"

export function UtilitiesManager({ propertyId, rooms }: Props) {
  const [utilities, setUtilities] = useState<UtilityRow[]>([])
  const [deposits, setDeposits] = useState<Record<string, number>>({})
  const [overrides, setOverrides] = useState<Record<string, Record<string, { override_amount?: number; estimated_units?: number }>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load existing configuration
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [utilList, roomUtilMap] = await Promise.all([
          getPropertyUtilities(propertyId),
          getRoomUtilitiesForProperty(propertyId),
        ])
        if (!mounted) return

        setUtilities(utilList.map((u) => ({
          id: u.id,
          label: u.label,
          category: u.category,
          pricing_mode: u.pricing_mode,
          amount: u.amount,
          unit_label: u.unit_label,
          default_units: u.default_units,
          is_optional: u.is_optional,
          sort_order: u.sort_order,
        })))

        const dep: Record<string, number> = {}
        for (const r of rooms) dep[r.id] = Number(r.deposit_months ?? 1)
        setDeposits(dep)

        const ovr: Record<string, Record<string, { override_amount?: number; estimated_units?: number }>> = {}
        for (const [roomId, items] of Object.entries(roomUtilMap)) {
          ovr[roomId] = {}
          for (const item of items as RoomUtility[]) {
            ovr[roomId][item.utility_id] = {
              override_amount: item.override_amount != null ? Number(item.override_amount) : undefined,
              estimated_units: item.estimated_units != null ? Number(item.estimated_units) : undefined,
            }
          }
        }
        setOverrides(ovr)
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load utilities")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [propertyId])
const addUtility = () => {
    setUtilities((prev) => [...prev, {
      label: "",
      category: "monthly",
      pricing_mode: "flat",
      amount: 0,
      unit_label: "unit",
      default_units: 0,
      is_optional: false,
      sort_order: prev.length,
    }])
  }

  const updateUtility = (index: number, patch: Partial<UtilityRow>) => {
    setUtilities((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)))
  }

  const removeUtility = (index: number) => {
    setUtilities((prev) => prev.filter((_, i) => i !== index))
  }

  const setDeposit = (roomId: string, value: number) => {
    setDeposits((prev) => ({ ...prev, [roomId]: value }))
  }

  const setOverride = (roomId: string, utilityId: string, key: "override_amount" | "estimated_units", value?: number) => {
    setOverrides((prev) => {
      const room = prev[roomId] || {}
      return { ...prev, [roomId]: { ...room, [utilityId]: { ...room[utilityId], [key]: value } } }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const valid = utilities.filter((u) => u.label.trim())
      const res = await savePropertyUtilities(propertyId, valid)
      if (!res.success) throw new Error(res.error || "Failed to save utilities")

      for (const [roomId, months] of Object.entries(deposits)) {
        const resDep = await updateRoomDeposit(roomId, months)
        if (!resDep.success) throw new Error(resDep.error || "Failed to save deposit")
      }

      for (const [roomId, utilMap] of Object.entries(overrides)) {
        for (const [utilityId, vals] of Object.entries(utilMap)) {
          const resOvr = await saveRoomUtility(roomId, utilityId, vals)
          if (!resOvr.success) throw new Error(resOvr.error || "Failed to save room usage")
        }
      }

      setSuccess("Utilities and room costs saved. Tenants will see these the next time they scan the QR code.")
    } catch (e: any) {
      setError(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }
if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="mr-1.5 inline h-4 w-4" /> {success}
        </div>
      )}

      {/* ===== Building-level utilities ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold text-slate-900">Utilities & costs</h2>
            <p className="text-xs text-slate-500">Rates applied to every unit in this building. Set a room's own usage below.</p>
          </div>
          <button onClick={addUtility} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {utilities.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No utilities added yet. Add rent, water, electricity, garbage, deposit, etc.
            </div>
          ) : (
            utilities.map((util, index) => (
              <div key={index} className="space-y-2 p-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[140px] flex-1">
                    <Label>Name</Label>
                    <input
                      list="utility-presets"
                      value={util.label}
                      onChange={(e) => updateUtility(index, { label: e.target.value })}
                      placeholder="e.g. Water"
                      className={inputCls}
                    />
                  </div>
                  <div className="w-[150px]">
                    <Label>When it's paid</Label>
                    <select
                      value={util.category}
                      onChange={(e) => updateUtility(index, { category: e.target.value as any })}
                      className={inputCls}
                    >
                      {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="w-[130px]">
                    <Label>Pricing</Label>
                    <select
                      value={util.pricing_mode}
                      onChange={(e) => updateUtility(index, { pricing_mode: e.target.value as any })}
                      className={inputCls}
                    >
                      {PRICING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="w-[110px]">
                    <Label>{util.pricing_mode === "per_unit" ? "Rate (KES)" : "Amount (KES)"}</Label>
                    <input
                      type="number"
                      min="0"
                      value={util.amount || ""}
                      onChange={(e) => updateUtility(index, { amount: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={() => removeUtility(index)}
                    className="mb-0.5 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove utility"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {util.pricing_mode === "per_unit" && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-[130px]">
                      <Label>Unit label</Label>
                      <input
                        value={util.unit_label || ""}
                        onChange={(e) => updateUtility(index, { unit_label: e.target.value })}
                        placeholder="e.g. m³, unit"
                        className={inputCls}
                      />
                    </div>
                    <div className="w-[150px]">
                      <Label>Avg monthly usage</Label>
                      <input
                        type="number"
                        min="0"
                        value={util.default_units || ""}
                        onChange={(e) => updateUtility(index, { default_units: Number(e.target.value) })}
                        className={inputCls}
                      />
                    </div>
                    <p className="mb-1 text-xs text-slate-400">
                      Shown to tenants as “rate × approx usage” until you set each room's own usage.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <datalist id="utility-presets">
          {PRESET_LABELS.map((l) => <option key={l} value={l} />)}
        </datalist>
      </section>
{/* ===== Per-room usage & deposit ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Per room</h2>
          <p className="text-xs text-slate-500">Set each unit's deposit and estimated usage (e.g. "3 units of water/month").</p>
        </div>

        <div className="divide-y divide-slate-100">
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Add rooms first to configure them.</div>
          ) : (
            rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                utilities={utilities}
                deposit={deposits[room.id] ?? 1}
                overrides={overrides[room.id] || {}}
                onDepositChange={(v) => setDeposit(room.id, v)}
                onOverrideChange={(utilityId, key, value) => setOverride(room.id, utilityId, key, value)}
              />
            ))
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save utilities & room costs
        </button>
      </div>
    </div>
  )
}

// ===== Room row with per-utility controls =====
function RoomRow({
  room, utilities, deposit, overrides, onDepositChange, onOverrideChange,
}: {
  room: Room
  utilities: UtilityRow[]
  deposit: number
  overrides: Record<string, { override_amount?: number; estimated_units?: number }>
  onDepositChange: (value: number) => void
  onOverrideChange: (utilityId: string, key: "override_amount" | "estimated_units", value?: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const monthly = utilities.filter((u) => u.category === "monthly")
  const oneTime = utilities.filter((u) => u.category === "one_time")

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Pencil className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Room {room.room_number}</p>
            <p className="text-xs text-slate-500">KES {Number(room.monthly_rent).toLocaleString()}/mo</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Deposit: {deposit} mo
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${expanded ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[180px]">
              <Label>Deposit (months of rent)</Label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={deposit || ""}
                placeholder="1"
                onChange={(e) => onDepositChange(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <p className="mb-1 text-xs text-slate-400">Used to calculate the tenant's move-in deposit.</p>
          </div>
{monthly.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Monthly</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {monthly.map((util) => (
                  <UtilControl
                    key={util.id || util.label}
                    util={util}
                    value={overrides[util.id || ""]}
                    onChange={(key, val) => onOverrideChange(util.id || "", key, val)}
                  />
                ))}
              </div>
            </div>
          )}

          {oneTime.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">One-time / move-in</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {oneTime.map((util) => (
                  <div key={util.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <span className="text-sm text-slate-600">{util.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={overrides[util.id || ""]?.override_amount ?? ((util.amount || 0) as number)}
                      onChange={(e) => onOverrideChange(util.id || "", "override_amount", Number(e.target.value))}
                      className={`${inputCls} mt-1`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthly.length === 0 && oneTime.length === 0 && (
            <p className="text-xs text-slate-400">No utilities to configure yet. Add them above first.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ===== Control for a single monthly utility on a room =====
function UtilControl({
  util, value, onChange,
}: {
  util: UtilityRow
  value?: { override_amount?: number; estimated_units?: number }
  onChange: (key: "override_amount" | "estimated_units", value?: number) => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <span className="text-sm text-slate-600">{util.label}</span>
      {util.pricing_mode === "flat" ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-slate-400">KES</span>
          <input
            type="number"
            min="0"
            value={value?.override_amount ?? util.amount}
            onChange={(e) => onChange("override_amount", Number(e.target.value))}
            className={inputCls}
          />
          <span className="text-xs text-slate-400 text-nowrap">/month</span>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={value?.override_amount ?? util.amount}
            onChange={(e) => onChange("override_amount", Number(e.target.value))}
            className={inputCls}
            aria-label={`${util.label} rate`}
          />
          <span className="text-xs text-slate-400">×</span>
          <input
            type="number"
            min="0"
            value={value?.estimated_units ?? util.default_units ?? ""}
            onChange={(e) => onChange("estimated_units", Number(e.target.value))}
            className={inputCls}
            aria-label={`${util.label} units`}
          />
          <span className="text-xs text-slate-400 text-nowrap">{util.unit_label || "units"}/mo</span>
        </div>
      )}
    </div>
  )
}