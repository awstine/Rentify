import { useState, type FormEvent } from "react"
import { Loader2, FileText } from "lucide-react"

import { createLease } from "../lib/leases"
import type { Room } from "../types/domain"

interface GenerateLeaseModalProps {
  propertyId: string
  room: Room
  tenantId: string
  tenantName: string
  tenantEmail: string
  tenantPhone?: string
  tenantIdNumber?: string
  tenantKraPin?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function GenerateLeaseModal({
  propertyId,
  room,
  tenantId,
  tenantName,
  tenantEmail,
  tenantPhone,
  tenantIdNumber,
  tenantKraPin,
  isOpen,
  onClose,
  onSuccess,
}: GenerateLeaseModalProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "confirm">("form")

  // Pre-filled form state
  const [monthlyRent, setMonthlyRent] = useState(room.monthly_rent)
  const [deposit, setDeposit] = useState(room.monthly_rent * 2)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    d.setDate(0)
    return d.toISOString().split("T")[0]
  })
  const [lateFeePercent, setLateFeePercent] = useState(5)
  const [noticeDays, setNoticeDays] = useState(30)
  const [terms, setTerms] = useState(
    `Standard tenancy agreement for Room ${room.room_number} at the property. 
Rent is due on the 1st of each month. Late fee of ${lateFeePercent}% applies after 5-day grace period.
${noticeDays}-day notice required for termination. No subletting permitted without written consent.`
  )

  if (!isOpen) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const lease = await createLease({
        property_id: propertyId,
        room_id: room.id,
        tenant_id: tenantId,
        monthly_rent: monthlyRent,
        deposit: deposit,
        start_date: startDate,
        end_date: endDate,
        late_fee_percent: lateFeePercent,
        notice_days: noticeDays,
        terms,
      })

      if (lease) {
        setStep("confirm")
      } else {
        setErrorMsg("Failed to create lease. Please try again.")
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create lease"
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignAndSend = async () => {
    // Landlord signs and sends to tenant
    setLoading(true)
    try {
      // In a real app, you'd sign here and trigger notification
      onSuccess()
      onClose()
    } catch (error) {
      setErrorMsg("Failed to send lease")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" /> Generate Lease
          </h2>
          <button type="button" onClick={onClose} className="text-lg font-bold text-gray-400 hover:text-gray-600">×</button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
        )}

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tenant Info (read-only) */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TENANT DETAILS</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                <div><span className="text-slate-500">Name:</span> <span className="font-semibold ml-2">{tenantName}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="font-semibold ml-2">{tenantEmail}</span></div>
                {tenantPhone && <div><span className="text-slate-500">Phone:</span> <span className="font-semibold ml-2">{tenantPhone}</span></div>}
                {tenantIdNumber && <div><span className="text-slate-500">ID No:</span> <span className="font-semibold ml-2">{tenantIdNumber}</span></div>}
                {tenantKraPin && <div><span className="text-slate-500">KRA PIN:</span> <span className="font-semibold ml-2">{tenantKraPin}</span></div>}
              </div>
            </div>

            {/* Property & Room */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PROPERTY & ROOM</p>
              <div className="mt-2 text-sm">
                <span className="font-semibold">Room {room.room_number}</span> — KES {Number(room.monthly_rent).toLocaleString()}/month
              </div>
            </div>

            {/* Lease Terms */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">LEASE TERMS</p>
              
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Rent (KES)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Deposit (KES)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Late Fee (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    required
                    value={lateFeePercent}
                    onChange={(e) => setLateFeePercent(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notice Period (days)</label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    required
                    value={noticeDays}
                    onChange={(e) => setNoticeDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  required
                  rows={6}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  placeholder="Edit lease terms..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Review & Send to Tenant"}
              </button>
            </div>
          </form>
        ) : (
          // Confirmation step
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Lease Ready for Review</h3>
            <p className="text-sm text-slate-500">Terms have been prepared. You can now send this to the tenant for their review and signature.</p>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="font-semibold text-slate-900">Next steps:</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
                <li>Tenant receives SMS + in-app notification</li>
                <li>Tenant reviews terms and clicks [Sign Lease] with OTP</li>
                <li>Once both parties sign, lease becomes ACTIVE</li>
                <li>Rentify auto-generates monthly invoices on the 1st</li>
              </ul>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Edit Terms
              </button>
              <button
                type="button"
                onClick={handleSignAndSend}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Sign & Send to Tenant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}