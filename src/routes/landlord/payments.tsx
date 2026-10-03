import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { CreditCard, Check, AlertCircle, Loader2, Calendar, Eye } from "lucide-react"
import { invoicesLoader } from "../../lib/loaders/landlord"
import { getLandlordPaymentSubmissions, reviewPaymentSubmission, formatKES } from "../../lib/payments"
import { VerificationGate } from "../../components/VerificationGate"

export { invoicesLoader }

export default function LandlordPaymentsScreen() {
  const { invoices } = useLoaderData() as { invoices: any[] }
  const revalidator = useRevalidator()
  
  const [paymentSubmissions, setPaymentSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [submissionsFilter, setSubmissionsFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Load payment submissions
  const loadSubmissions = async () => {
    setLoadingSubmissions(true)
    try {
      const { data: { user } } = await (await import("../../lib/supabase")).supabase.auth.getUser()
      if (user) {
        const submissions = await getLandlordPaymentSubmissions(user.id)
        setPaymentSubmissions(submissions)
      }
    } catch (e) {
      console.error("Failed to load payment submissions:", e)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  // Run on mount
  const [loaded, setLoaded] = useState(false)
  if (!loaded) {
    setLoaded(true)
    loadSubmissions()
  }

  const handleApprove = async (submission: any) => {
    if (!window.confirm(`Approve payment of ${formatKES(submission.amount)} from ${submission.tenants?.full_name || "tenant"}?`)) return
    setProcessingId(submission.id)
    const result = await reviewPaymentSubmission(submission.id, "approved")
    setProcessingId(null)
    if (result.success) {
      loadSubmissions()
      revalidator.revalidate()
    } else {
      alert(result.error || "Failed to approve")
    }
  }

  const handleReject = async (submission: any) => {
    const reason = prompt("Enter rejection reason (optional):")
    if (reason === null) return // User cancelled
    setProcessingId(submission.id)
    const result = await reviewPaymentSubmission(submission.id, "rejected", reason || undefined)
    setProcessingId(null)
    if (result.success) {
      loadSubmissions()
      revalidator.revalidate()
    } else {
      alert(result.error || "Failed to reject")
    }
  }

  const filteredSubmissions = paymentSubmissions.filter(s => 
    submissionsFilter === "all" || s.status === submissionsFilter
  )

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to view and manage payments.">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
            <p className="mt-1 text-slate-500">Review tenant payment submissions and track invoices.</p>
          </div>
        </div>

        {/* Payment Submissions Tab */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-900">Payment Submissions</h2>
              <div className="flex items-center gap-2">
                <select
                  value={submissionsFilter}
                  onChange={e => setSubmissionsFilter(e.target.value as typeof submissionsFilter)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>

          {loadingSubmissions ? (
            <div className="px-5 py-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
              <p className="mt-2 text-slate-500">Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">
                {submissionsFilter === "pending" ? "No pending payment submissions" : "No payment submissions found"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {submissionsFilter === "pending" 
                  ? "Tenant payments awaiting your approval will appear here."
                  : "Change the filter to see all submissions."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.map((sub) => (
                <div key={sub.id} className="px-5 py-4 hover:bg-slate-50/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{sub.tenants?.full_name || "Unnamed Tenant"}</p>
                        <p className="text-sm text-slate-500">
                          {sub.properties?.name || "Property"} · Room {sub.rooms?.room_number || "—"} · {formatKES(sub.amount)}
                        </p>
                        <p className="text-xs text-slate-400">
                          Paid via {sub.phone_number} · {new Date(sub.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        sub.status === "pending" ? "bg-amber-50 text-amber-700" :
                        sub.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {sub.status === "pending" && <AlertCircle className="h-3.5 w-3.5 animate-pulse" />}
                        {sub.status === "approved" && <Check className="h-3.5 w-3.5" />}
                        {sub.status === "rejected" && <AlertCircle className="h-3.5 w-3.5" />}
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>

                      {sub.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(sub)}
                            disabled={processingId === sub.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {processingId === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(sub)}
                            disabled={processingId === sub.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            {processingId === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                            Reject
                          </button>
                        </>
                      )}

                      {sub.status !== "pending" && (
                        <button
                          onClick={() => {}}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      )}
                    </div>
                  </div>

                  {(sub.mpesa_code || sub.rejection_reason) && (
                    <div className="mt-3 ml-13 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      {sub.mpesa_code && <p className="font-mono">M-PESA Code: {sub.mpesa_code}</p>}
                      {sub.rejection_reason && <p className="text-rose-600">Rejection reason: {sub.rejection_reason}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invoices Section */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">Auto-generated monthly invoices with credit tracking.</p>
          </div>

          {invoices.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">No invoices yet</p>
              <p className="mt-1 text-sm text-slate-500">Invoices are generated automatically on the 1st of each month for active leases.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tenant</th>
                    <th className="px-4 py-3 font-semibold">Property / Room</th>
                    <th className="px-4 py-3 font-semibold">Period</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Credit Applied</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">{inv.profiles?.full_name || "—"}</td>
                      <td className="px-4 py-3">{inv.properties?.name} / Room {inv.rooms?.room_number}</td>
                      <td className="px-4 py-3">
                        {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatKES(inv.amount)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">
                        {inv.credit_applied ? formatKES(inv.credit_applied) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                          inv.status === "overdue" ? "bg-rose-50 text-rose-700" :
                          inv.status === "partial" ? "bg-amber-50 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </VerificationGate>
  )
}
