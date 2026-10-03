import { Calculator, Info } from "lucide-react"
import type { Room, PropertyUtility, RoomUtility, RoomCostBreakdown, RoomCostLine } from "../types/domain"
import { computeRoomCostBreakdown } from "../lib/utilities"

interface Props {
  room: Room
  utilities: PropertyUtility[]
  roomUtilities: RoomUtility[]
  compact?: boolean
}

const fmt = (n: number) => "KES " + (Number.isFinite(n) ? n.toLocaleString() : "0")

function Line({ label, amount, estimated, detail }: RoomCostLine) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <div className="flex items-baseline gap-1.5 text-sm text-slate-600">
        <span>{label}</span>
        {estimated && (
          <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
            <Info className="mr-0.5 h-2.5 w-2.5" /> est.
          </span>
        )}
        {detail && <span className="text-xs text-slate-400">{detail}</span>}
      </div>
      <span className="text-sm font-medium text-slate-800">{fmt(amount)}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  )
}

export function RoomCostBreakdownCard({ room, utilities, roomUtilities, compact: _compact }: Props) {
  const breakdown: RoomCostBreakdown = computeRoomCostBreakdown(room, utilities, roomUtilities)
  const hasUtilities = breakdown.monthly.lines.length > 0 || breakdown.moveIn.lines.length > 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-900">Estimated cost — Room {room.room_number}</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle>Per month</SectionTitle>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 py-1">
              <span className="text-sm text-slate-600">Rent</span>
              <span className="text-sm font-semibold text-slate-900">{fmt(breakdown.monthly.rent)}</span>
            </div>
            {breakdown.monthly.lines.map((line) => (
              <Line key={line.label} {...line} />
            ))}
            <div className="flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2">
              <span className="text-sm font-semibold text-slate-900">Total / month</span>
              <span className="text-base font-bold text-slate-900">{fmt(breakdown.monthly.total)}</span>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>To move in</SectionTitle>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2 py-1">
              <span className="text-sm text-slate-600">
                Deposit ({(room.deposit_months ?? 1) === 1 ? "1 month" : `${room.deposit_months ?? 1} months`})
              </span>
              <span className="text-sm font-medium text-slate-800">{fmt(breakdown.moveIn.deposit)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 py-1">
              <span className="text-sm text-slate-600">First month rent</span>
              <span className="text-sm font-medium text-slate-800">{fmt(breakdown.moveIn.firstMonth)}</span>
            </div>
            {breakdown.moveIn.lines.map((line) => (
              <Line key={line.label} {...line} />
            ))}
            <div className="flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2">
              <span className="text-sm font-semibold text-slate-900">Total to enter</span>
              <span className="text-base font-bold text-slate-900">{fmt(breakdown.moveIn.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasUtilities && (
        <p className="mt-3 text-xs text-slate-400">
          No utility charges have been set up for this property yet.
        </p>
      )}
    </div>
  )
}