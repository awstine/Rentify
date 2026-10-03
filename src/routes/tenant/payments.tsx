import { useState, type FormEvent } from "react"
import { useLoaderData } from "react-router-dom"
import { CreditCard, Copy, Check, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { tenantDashboardLoader } from "../../lib/loaders/tenant"
import { createPaymentSubmission, getTenantPaymentSubmissions, getTenantCreditBalance, formatKES, getPaymentInstructions } from "../../lib/payments"
import type { Property, Room, PropertyPaymentSettings } from "../../types/domain"
import { getTimeBasedGreeting } from "../../lib/greeting"

export { tenantDashboardLoader }

type LoaderData = {
  room: (Room & { properties: Property; room_codes: { code: string; status: string }[] }) | null
  property: Property | null
  tenancy: any
  isAssigned: boolean
  userName: string
  tenantId: string | null
}

export default function TenantPaymentsScreen() {
  const { room, property, tenancy, isAssigned, userName, tenantId } = useLoaderData() as LoaderData
  const greeting = getTimeBasedGreeting(userName)

  // Load payment settings for the property
  const [paymentSettings, setPaymentSettings] = useState<PropertyPaymentSettings | null>(null)

  // Form state
  const [amount, setAmount] = useState<string>("")
  const [mpesaCode, setMpesaCode] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Payment history
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Credit balance
  const [creditBalance, setCreditBalance] = useState<number>(0)

  // Load data
  const loadData = async () => {
    if (!room || !property) return

    // Load payment settings
    try {
      const { data } = await (await import("../../lib/supabase")).supabase
        .from("property_payment_settings")
        .select("*")
        .eq("property_id", property.id)
        .maybeSingle()
      setPaymentSettings(data)
    } catch (e) {
      console.error("Failed to load payment settings:", e)
    }

    // Load credit balance
    try {
      if (tenantId) {
        const credit = await getTenantCreditBalance(tenantId)
        setCreditBalance(credit.balance)

        // Load payment history
        const history = await getTenantPaymentSubmissions(tenantId)
        setSubmissions(history)
      }
    } catch (e) {
      console.error("Failed to load credit/history:", e)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Run on mount
  const [loaded, setLoaded] = useState(false)
  if (!loaded) {
    setLoaded(true)
    loadData()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!amount.trim()) {
      setMessage({ type: "error", text: "Please enter an amount" })
      return
    }
    if (!mpesaCode.trim()) {
      setMessage({ type: "error", text: "Please enter the M-PESA confirmation code" })
      return
    }
    if (!phoneNumber.trim()) {
      setMessage({ type: "error", text: "Please enter the phone number used to pay" })
      return
    }
    if (!room || !property) {
      setMessage({ type: "error", text: "No room assigned" })
      return
    }
    if (!tenantId) {
      setMessage({ type: "error", text: "Tenant profile not found" })
      return
    }

    setSubmitting(true)

    try {
      const result = await createPaymentSubmission({
        tenant_id: tenantId,
        property_id: property.id,
        room_id: room.id,
        lease_id: tenancy?.id,
        amount: parseFloat(amount),
        mpesa_code: mpesaCode.trim(),
        phone_number: phoneNumber.trim()
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setMessage({ type: "success", text: "Payment submitted! Landlord will review and approve." })
      setAmount("")
      setMpesaCode("")
      setPhoneNumber("")
      loadData() // Refresh history
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to submit payment" })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAssigned || !room || !property) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}</h1>
          <p className="mt-1 text-slate-500">Welcome to your tenant portal.</p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <CreditCard className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No room assigned yet</h2>
          <p className="mt-2 text-slate-500">You don\'t have an active room assignment.</p>
        </section>
      </div>
    )
  }

  const instructions = getPaymentInstructions(paymentSettings)
  const hasPaybill = !!paymentSettings?.paybill_number
  const hasTill = !!paymentSettings?.till_number

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-500">Pay rent for your room at {property.name}</p>
      </div>

      {/* Credit Balance Card */}
      {creditBalance > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Prepaid Credit</p>
                <p className="text-xl font-bold text-emerald-700">{formatKES(creditBalance)}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-emerald-600">
            This credit will be automatically applied to your next invoice(s).
          </p>
        </section>
      )}

      {/* Payment Instructions Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Payment Details</h2>
        <p className="mt-1 text-sm text-slate-500">Use these details to pay via M-PESA</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {hasPaybill && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">M-PESA Paybill</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2.5 text-lg font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">
                  {instructions.paybill}
                </code>
                <button
                  type="button"
                  onClick={async () => { await navigator.clipboard.writeText(instructions.paybill!); setMessage({ type: "success", text: "Paybill copied!" }); setTimeout(() => setMessage(null), 2000) }}
                  className="rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {hasTill && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">M-PESA Till Number</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2.5 text-lg font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">
                  {instructions.till}
                </code>
                <button
                  type="button"
                  onClick={async () => { await navigator.clipboard.writeText(instructions.till!); setMessage({ type: "success", text: "Till number copied!" }); setTimeout(() => setMessage(null), 2000) }}
                  className="rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Account Reference</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white px-3 py-2.5 text-lg font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">
                {instructions.accountRef}
              </code>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(instructions.accountRef); setMessage({ type: "success", text: "Account reference copied!" }); setTimeout(() => setMessage(null), 2000) }}
                className="rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Enter this as the "Account Number" when paying via M-PESA</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">How to pay:</p>
          <ol className="mt-2 space-y-1 text-sm text-amber-700 list-decimal list-inside">
            <li>Open M-PESA app or dial *234#</li>
            <li>Select <strong>Lipa na M-PESA</strong> ? <strong>Pay Bill</strong> (or Buy Goods for Till)</li>
            <li>Enter Paybill: <code className="px-1.5 py-0.5 bg-amber-100 rounded">{instructions.paybill || instructions.till}</code></li>
            <li>Enter Account Number: <code className="px-1.5 py-0.5 bg-amber-100 rounded">{instructions.accountRef}</code></li>
            <li>Enter amount and confirm with PIN</li>
            <li>Copy the <strong>confirmation code</strong> from the M-PESA SMS</li>
            <li>Paste it below and submit</li>
          </ol>
        </div>
      </section>

      {/* Submit Payment Form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Submit Payment</h2>
        <p className="mt-1 text-sm text-slate-500">After paying via M-PESA, enter the confirmation code below</p>

        {message && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${
            message.type === "success" 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
              : "bg-rose-50 text-rose-700 border border-rose-100"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (KES)</label>
            <input
              type="number"
              name="amount"
              required
              min="1"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g., 15000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">M-PESA Confirmation Code</label>
            <input
              type="text"
              name="mpesaCode"
              required
              value={mpesaCode}
              onChange={e => setMpesaCode(e.target.value.toUpperCase())}
              placeholder="e.g., SJL3#$KDJ"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-xs text-slate-400">From the M-PESA SMS (e.g., SJL3#$KDJ)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number Used to Pay</label>
            <input
              type="tel"
              name="phoneNumber"
              required
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="2547XXXXXXXX"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Approval"}
          </button>
        </form>
      </section>

      {/* Payment History */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Payment History</h2>
        </div>

        {loadingHistory ? (
          <div className="px-5 py-8 text-center text-slate-500">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
            <p className="mt-2">Loading payment history...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-500">
            <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No payment submissions yet</p>
            <p className="mt-1 text-sm text-slate-500">Your submitted payments will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((sub) => (
              <div key={sub.id} className="px-5 py-4 hover:bg-slate-50/50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <CreditCard className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{formatKES(sub.amount)}</p>
                      <p className="text-sm text-slate-500">
                        {sub.properties?.name || "Property"} · Room {sub.rooms?.room_number || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      sub.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      sub.status === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>
                      {sub.status === "pending" && <AlertCircle className="h-3.5 w-3.5 animate-pulse" />}
                      {sub.status === "approved" && <Check className="h-3.5 w-3.5" />}
                      {sub.status === "rejected" && <AlertCircle className="h-3.5 w-3.5" />}
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                    <span className="text-slate-400">
                      {new Date(sub.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {(sub.mpesa_code || sub.rejection_reason) && (
                  <div className="mt-3 ml-13 text-xs text-slate-500">
                    {sub.mpesa_code && <p>M-PESA Code: <code className="px-1 py-0.5 bg-slate-100 rounded font-mono">{sub.mpesa_code}</code></p>}
                    {sub.rejection_reason && <p className="text-rose-600">Rejected: {sub.rejection_reason}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
