import { useState, useEffect } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { Building2, Camera, Check, Clock, Loader2, Mail, MapPin, Phone, ShieldCheck, X } from "lucide-react"
import { adminListingsLoader } from "../../lib/loaders/admin"
import { reviewPropertyListing } from "../../lib/properties"
import { createLandlordNotification } from "../../lib/notifications"
import type { PropertyListingQueueItem } from "../../types/domain"

export { adminListingsLoader }

type QueueItem = PropertyListingQueueItem & { image_signed_urls: string[] | undefined }

const kycBadge: Record<string, { label: string; className: string }> = {
  approved: { label: "KYC Verified", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  pending: { label: "KYC Pending", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  rejected: { label: "KYC Rejected", className: "bg-rose-50 text-rose-700 ring-rose-100" },
  more_info: { label: "KYC More Info", className: "bg-sky-50 text-sky-700 ring-sky-100" },
}

export default function AdminListingsScreen() {
  const { queue: loaderQueue, error: loaderError } = useLoaderData() as { queue: QueueItem[]; error: string | null }
  const [queue, setQueue] = useState<QueueItem[]>(loaderQueue || [])
  const [explicitSelected, setExplicitSelected] = useState<QueueItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(loaderError)
  const revalidator = useRevalidator()

  useEffect(() => {
    setQueue(loaderQueue || [])
    setError(loaderError)
  }, [loaderQueue, loaderError])

  // Derive the active item: explicit selection wins, otherwise the oldest pending
  const selected = explicitSelected ?? queue[0] ?? null

  const finishReview = (itemId: string) => {
    setQueue(prev => prev.filter(q => q.id !== itemId))
    setExplicitSelected(null)
    revalidator.revalidate()
  }

  const handleApprove = async (item: QueueItem) => {
    if (!window.confirm(`Approve the listing of "${item.property_name}" by ${item.landlord_full_name || "this landlord"}?`)) return
    setProcessing(item.id)
    setError(null)
    const result = await reviewPropertyListing(item.id, "approved")
    setProcessing(null)
    if (!result.success) {
      setError(result.error || "Failed to approve listing")
      return
    }
    await createLandlordNotification({
      landlord_id: item.landlord_id,
      type: "listing_approved",
      title: "Property Approved",
      message: `Your property "${item.property_name}" has been approved and is now live.`,
      related_entity_type: "property",
      related_entity_id: item.id,
    })
    finishReview(item.id)
  }

  const handleReject = async (item: QueueItem) => {
    if (!rejectReason.trim()) {
      setError("Please provide a rejection reason")
      return
    }
    if (!window.confirm(`Reject the listing of "${item.property_name}"?`)) return
    setProcessing(item.id)
    setError(null)
    const result = await reviewPropertyListing(item.id, "rejected", rejectReason)
    setProcessing(null)
    if (!result.success) {
      setError(result.error || "Failed to reject listing")
      return
    }
    await createLandlordNotification({
      landlord_id: item.landlord_id,
      type: "listing_rejected",
      title: "Property Rejected",
      message: `Your property "${item.property_name}" was not approved. Reason: ${rejectReason}`,
      related_entity_type: "property",
      related_entity_id: item.id,
    })
    finishReview(item.id)
  }
return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Listing Requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">Review properties submitted by landlords before they go live.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
          <Building2 className="h-3.5 w-3.5" /> {queue.length} pending
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">No pending listing requests</p>
          <p className="mt-1 text-sm text-slate-500">New property submissions from landlords will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {queue.map(item => {
              const isActive = selected?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setExplicitSelected(item); setRejectReason(""); setError(null) }}
                  className={`w-full rounded-xl border p-4 text-left transition ${isActive ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.property_name}</p>
                    <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{item.location}</p>
                  <p className="mt-2 text-xs text-slate-500">by <span className="font-semibold text-slate-700">{item.landlord_full_name || "Unknown"}</span></p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(item.submitted_at).toLocaleString()}</p>
                </button>
              )
            })}
          </div>
{selected && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.property_name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{selected.location}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"><Clock className="h-3 w-3" /> Pending</span>
              </div>

              {selected.description && <p className="mt-4 text-sm text-slate-600">{selected.description}</p>}

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-center">
                <div><p className="text-lg font-bold text-slate-900">{selected.unit_count}</p><p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Units</p></div>
                <div><p className="text-lg font-bold text-emerald-700">{selected.available_count}</p><p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Available</p></div>
                <div><p className="text-lg font-bold text-slate-900">{formatRent(selected.min_rent, selected.max_rent)}</p><p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">Rent (KES)</p></div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Photos</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(selected.image_signed_urls || []).length > 0 ? (
                    (selected.image_signed_urls || []).map((url, i) => (
                      <div key={`${url}-${i}`} className="aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <img src={url} alt={`Property photo ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Landlord</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">
                    {selected.landlord_full_name || "Unknown"}
                    {selected.landlord_kyc_status && (() => {
                      const kyc = kycBadge[selected.landlord_kyc_status || ""]
                      return kyc ? (
                        <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${kyc.className}`}>
                          <ShieldCheck className="h-3 w-3" />{kyc.label}
                        </span>
                      ) : null
                    })()}
                  </p>
                  {selected.landlord_email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selected.landlord_email}</p>}
                  {selected.landlord_phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selected.landlord_phone}</p>}
                  {selected.landlord_id_number && <p className="text-xs text-slate-400">ID Number: {selected.landlord_id_number}</p>}
                </div>
              </div>
<div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">Rejection reason (if rejecting)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  placeholder="e.g. Clear building photos required, verify ownership document..."
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={processing === selected.id}
                  onClick={() => handleReject(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Reject
                </button>
                <button
                  type="button"
                  disabled={processing === selected.id}
                  onClick={() => handleApprove(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve Listing
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatRent(min?: number, max?: number): string {
  if (min == null && max == null) return "—"
  if (min === max) return min?.toLocaleString() ?? "—"
  return `${min?.toLocaleString() ?? "?"} – ${max?.toLocaleString() ?? "?"}`
}