import { useState, useEffect } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { Check, X, ShieldCheck, Camera, Loader2, Search } from "lucide-react"
import { adminVerificationLoader } from "../../lib/loaders/admin"
import { reviewVerification } from "../../lib/verification"
import type { VerificationQueueItem } from "../../types/domain"

export { adminVerificationLoader as verificationLoader }

export default function AdminVerificationScreen() {
  const { queue: loaderQueue } = useLoaderData() as { queue: (VerificationQueueItem & { 
    id_front_signed_url?: string; 
    id_back_signed_url?: string; 
    selfie_signed_url?: string;
  })[] }
  const [queue, setQueue] = useState<(VerificationQueueItem & { 
    id_front_signed_url?: string; 
    id_back_signed_url?: string; 
    selfie_signed_url?: string;
  })[]>(loaderQueue || [])
  const [selected, setSelected] = useState<(VerificationQueueItem & { 
    id_front_signed_url?: string; 
    id_back_signed_url?: string; 
    selfie_signed_url?: string;
  }) | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const revalidator = useRevalidator()

  useEffect(() => {
    setQueue(loaderQueue || [])
  }, [loaderQueue])

  const handleApprove = async (item: VerificationQueueItem) => {
    if (!window.confirm(`Approve ${item.full_name || "this landlord"}?`)) return
    setProcessing(item.id)
    setError(null)
    const result = await reviewVerification(item.id, "approved")
    setProcessing(null)
    if (result.success) {
      setQueue((prev) => prev.filter((q) => q.id !== item.id))
      setSelected(null)
      revalidator.revalidate()
    } else {
      setError(result.error || "Failed to approve")
    }
  }

  const handleReject = async (item: VerificationQueueItem) => {
    if (!rejectReason.trim()) {
      setError("Please provide a rejection reason")
      return
    }
    if (!window.confirm(`Reject ${item.full_name || "this landlord"}?`)) return
    setProcessing(item.id)
    setError(null)
    const result = await reviewVerification(item.id, "rejected", rejectReason)
    setProcessing(null)
    if (result.success) {
      setQueue((prev) => prev.filter((q) => q.id !== item.id))
      setSelected(null)
      setRejectReason("")
      revalidator.revalidate()
    } else {
      setError(result.error || "Failed to reject")
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Verification Queue</h1>
          <p className="mt-0.5 text-sm text-slate-500">Review landlord KYC submissions (ID + selfie).</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
          <ShieldCheck className="h-3.5 w-3.5" /> {queue.length} pending
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">No pending verifications</p>
          <p className="mt-1 text-sm text-slate-500">New landlord KYC submissions will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSelected(item); setRejectReason("") }}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">
                    {(item.full_name || "L").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.full_name || "Unnamed Landlord"}</p>
                    <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                  Pending
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <ImageThumb label="ID Front" url={item.id_front_signed_url} />
                <ImageThumb label="ID Back" url={item.id_back_signed_url} />
                <ImageThumb label="Selfie" url={item.selfie_signed_url} />
              </div>

              {item.id_number && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="h-3.5 w-3.5" /> ID: {item.id_number}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Search className="h-4 w-4" /> Review
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Review KYC — {selected.full_name || "Unnamed"}</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <ImagePreview label="ID Front" url={selected.id_front_signed_url} />
              <ImagePreview label="ID Back" url={selected.id_back_signed_url} />
              <ImagePreview label="Selfie" url={selected.selfie_signed_url} />
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700">Details</p>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Name: {selected.full_name || "N/A"}</p>
                <p>ID Number: {selected.id_number || "N/A"}</p>
                <p>Submitted: {new Date(selected.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Rejection reason (if rejecting)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                placeholder="e.g. Blurry ID photo, name mismatch..."
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
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageThumb({ label, url }: { label: string; url?: string }) {
  return (
    <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <Camera className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

function ImagePreview({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Camera className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  )
}