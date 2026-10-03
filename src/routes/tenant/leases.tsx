import { Link, useLoaderData } from "react-router-dom"
import { useState } from "react"
import { CheckCircle, FileText, PenLine, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { tenantLeasesLoader } from "../../lib/loaders/tenant"

export { tenantLeasesLoader }

type LeaseDetail = any

export default function TenantLeasesScreen() {
  const { lease, leases } = useLoaderData() as { lease?: LeaseDetail; leases?: LeaseDetail[] }

  if (lease) {
    return <LeaseReviewView lease={lease} />
  }

  return <LeaseListView leases={leases ?? []} />
}

function LeaseListView({ leases }: { leases: LeaseDetail[] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Leases</h1>
        <p className="mt-1 text-slate-500">Review and sign your tenancy agreements.</p>
      </div>

      {leases.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">No leases yet</p>
          <p className="mt-1 text-sm text-slate-500">When your landlord sends a lease, it will appear here.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {leases.map((l) => (
            <Link
              key={l.id}
              to={`/tenant/leases/${l.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{l.properties?.name || "Property"}</p>
                    <p className="text-sm text-slate-500">Room {l.rooms?.room_number || "—"} · KES {Number(l.monthly_rent).toLocaleString()}/mo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    l.status === "active" ? "bg-emerald-50 text-emerald-700"
                    : l.status === "pending_tenant" ? "bg-amber-50 text-amber-700"
                    : l.status === "pending_landlord" ? "bg-sky-50 text-sky-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {l.status === "pending_tenant" ? "Awaiting your signature" : l.status === "active" ? "Active" : l.status === "pending_landlord" ? "Changes requested" : l.status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function LeaseReviewView({ lease }: { lease: LeaseDetail }) {
  const [step, setStep] = useState<"review" | "otp" | "done">("review")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [requestMsg, setRequestMsg] = useState("")
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leaseStart = lease.start_date ? new Date(lease.start_date).toLocaleDateString("en-KE") : "—"
  const leaseEnd = lease.end_date ? new Date(lease.end_date).toLocaleDateString("en-KE") : "—"

  const handleRequestChanges = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from("leases")
        .update({ status: "pending_landlord", terms: requestMsg || lease.terms })
        .eq("id", lease.id)
      if (error) throw error
      setShowRequestForm(false)
      setRequestMsg("")
      window.location.reload()
    } catch (e: any) {
      setError(e.message || "Failed to submit request")
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      // TODO: implement OTP request for lease signing
    } finally {
      setLoading(false)
    }
  }

  const handleSignLease = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setStep("done")
    } catch (e: any) {
      setError(e.message || "Failed to sign lease")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/tenant/leases"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 block w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leases
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lease Agreement</h1>
            <p className="mt-1 text-sm text-slate-500">{lease.properties?.name} · Room {lease.rooms?.room_number}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            lease.status === "active" ? "bg-emerald-50 text-emerald-700"
            : lease.status === "pending_tenant" ? "bg-amber-50 text-amber-700"
            : lease.status === "pending_landlord" ? "bg-sky-50 text-sky-700"
            : "bg-slate-100 text-slate-600"
          }`}>
            {lease.status.replace("_", " ")}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Monthly Rent</p>
            <p className="mt-1 font-bold text-slate-900">KES {Number(lease.monthly_rent).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Deposit</p>
            <p className="mt-1 font-bold text-slate-900">KES {Number(lease.deposit).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Start Date</p>
            <p className="mt-1 font-semibold text-slate-900">{leaseStart}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">End Date</p>
            <p className="mt-1 font-semibold text-slate-900">{leaseEnd}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="font-medium text-slate-700">Terms & Conditions</p>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-60 overflow-auto text-sm text-slate-700 whitespace-pre-wrap font-mono">
            {lease.terms}
          </div>
        </div>

        {lease.status === "pending_tenant" && step === "review" && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">Action Required</p>
            <p className="mt-1 text-sm text-slate-600">This lease is awaiting your signature. Please review the terms above and sign to activate the lease.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setShowRequestForm(true); setRequestMsg("") }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Request Changes
              </button>
              <button
                onClick={handleRequestOtp}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <PenLine className="h-4 w-4" /> Sign Lease
              </button>
            </div>
          </div>
        )}

        {lease.status === "pending_tenant" && step === "otp" && (
          <form onSubmit={handleSignLease} className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
            <p className="font-semibold text-emerald-800">Enter the 6-digit OTP sent to your phone</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-center text-2xl tracking-widest focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {error && <div className="text-sm text-rose-700">{error}</div>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                Sign Lease
              </button>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {lease.status === "pending_tenant" && showRequestForm && (
          <form onSubmit={(e) => { e.preventDefault(); handleRequestChanges() }} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="font-semibold text-slate-900">Request Changes</p>
            <p className="text-sm text-slate-600">Describe the changes you would like to request from the landlord.</p>
            <textarea
              value={requestMsg}
              onChange={(e) => setRequestMsg(e.target.value)}
              rows={4}
              placeholder="Please specify what changes you want..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowRequestForm(false); setRequestMsg("") }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
              </button>
            </div>
          </form>
        )}

        {lease.status === "active" && step === "done" && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-emerald-800">Lease Signed!</h2>
            <p className="mt-2 text-emerald-700">The lease is now active. Your landlord has been notified.</p>
          </div>
        )}
      </div>
    </div>
  )
}