import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, Phone } from "lucide-react"
import { requestLoginOtp, verifyLoginOtp } from "../lib/booking"
import { getTenantFromSession as checkTenantSession } from "../lib/tenant-auth"

export default function TenantLoginScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/tenant/dashboard"

  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check if already logged in via session
  useEffect(() => {
    const checkSession = async () => {
      const tenant = await checkTenantSession()
      if (tenant) {
        navigate(redirectTo, { replace: true })
      }
    }
    checkSession()
  }, [navigate, redirectTo])

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const cleaned = phone.replace(/\\D/g, "")
    if (cleaned.length < 9) {
      setError("Enter a valid phone number")
      setLoading(false)
      return
    }

    const formatted = cleaned.startsWith("254") ? "0" + cleaned.slice(3) : cleaned
    const result = await requestLoginOtp(formatted)
    if (result.success) {
      setStep("otp")
      setSuccess("OTP sent. Check your phone.")
    } else {
      setError(result.error || "Failed to send OTP")
    }
    setLoading(false)
  }

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP")
      setLoading(false)
      return
    }

    const cleaned = phone.replace(/\\D/g, "")
    const formatted = cleaned.startsWith("254") ? "0" + cleaned.slice(3) : cleaned

    const result = await verifyLoginOtp(formatted, otp)
    if (result.success && result.token) {
      localStorage.setItem("tenant_session", result.token)
      setSuccess("Logged in successfully!")
      setTimeout(() => navigate(redirectTo, { replace: true }), 800)
    } else {
      setError(result.error || "Invalid OTP")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-600">
            R
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your phone number</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="h-5 w-5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0712 345 678"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-slate-500 text-center">We sent a 6-digit code to <strong>{phone}</strong></p>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl tracking-widest focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Didn't receive the code? <button type="button" onClick={() => setStep("phone")} className="text-emerald-700 font-medium hover:underline">Resend</button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
