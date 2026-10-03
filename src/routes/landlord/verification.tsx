import { useState, type FormEvent } from "react"
import { Link, useLoaderData, useNavigate } from "react-router-dom"
import { ArrowLeft, ShieldCheck, AlertCircle, Loader2, Camera, CheckCircle, XCircle, Sparkles } from "lucide-react"
import { submitVerification, uploadKycImage } from "../../lib/verification"
import { verificationLoader } from "../../lib/loaders/landlord"
import type { LandlordVerification, VerificationStatus } from "../../types/domain"

export { verificationLoader }

export default function LandlordVerificationScreen() {
  const { verification } = useLoaderData() as { verification: LandlordVerification | null }
  const navigate = useNavigate()

  const [step, setStep] = useState<"overview" | "upload">(
    verification?.status === "pending" || verification?.status === "approved" ? "overview" : "upload"
  )
  const [idFront, setIdFront] = useState<File | null>(null)
  const [idBack, setIdBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [idNumber, setIdNumber] = useState("")
  const [fullName, setFullName] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)

  const statusConfig: Record<VerificationStatus, { label: string; className: string; icon: any }> = {
    pending: { label: "Under Review", className: "bg-amber-50 text-amber-700 ring-amber-100", icon: AlertCircle },
    approved: { label: "Verified", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: CheckCircle },
    rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 ring-rose-100", icon: XCircle },
    more_info: { label: "More Info Needed", className: "bg-sky-50 text-sky-700 ring-sky-100", icon: AlertCircle },
  }

  const config = verification ? statusConfig[verification.status] : { label: "Not Started", className: "bg-slate-50 text-slate-700 ring-slate-100", icon: ShieldCheck }
  const Icon = config.icon
  const isNewSignup = !verification && !dismissedWelcome

  const handleImageChange = (field: "idFront" | "idBack" | "selfie", file: File | null) => {
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB")
        return
      }
    }
    if (field === "idFront") setIdFront(file)
    else if (field === "idBack") setIdBack(file)
    else setSelfie(file)
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!idFront || !idBack || !selfie) {
      setError("Please upload all three images: ID Front, ID Back, and Selfie")
      return
    }
    if (!idNumber.trim() || !fullName.trim()) {
      setError("Please enter your ID number and full name")
      return
    }

    setLoading(true)

    try {
      const uploads = await Promise.all([
        uploadKycImage(idFront, "id-front"),
        uploadKycImage(idBack, "id-back"),
        uploadKycImage(selfie, "selfie"),
      ])

      const [frontResult, backResult, selfieResult] = uploads
      if (!frontResult.success || !backResult.success || !selfieResult.success) {
        throw new Error(frontResult.error || backResult.error || selfieResult.error || "Upload failed")
      }

      const result = await submitVerification({
        id_front_url: frontResult.url!,
        id_back_url: backResult.url!,
        selfie_url: selfieResult.url!,
        id_number: idNumber.trim(),
        full_name: fullName.trim(),
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || "Submission failed")
      }

      setStep("overview")
      navigate("/landlord/verification", { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ImageUpload = ({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) => (
    <div className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
      {file ? (
        <>
          <img src={URL.createObjectURL(file)} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 rounded-full bg-rose-500/90 p-1 text-white hover:bg-rose-600"
            aria-label={`Remove ${label}`}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </>
      ) : (
        <label className="flex h-full w-full flex-col items-center justify-center gap-2 cursor-pointer p-4 text-center">
          <Camera className="h-8 w-8 text-slate-300" />
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-xs text-slate-400">Click to upload</span>
          <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="hidden" />
        </label>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/landlord/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 block w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Landlord Verification</h1>
          <p className="mt-1 text-slate-500">Complete KYC verification to unlock all landlord features.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${config.className}`}>
          <Icon className="h-3.5 w-3.5" /> {config.label}
        </span>
      </div>

      {isNewSignup && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Welcome to Rentify!</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your account has been created. To start adding properties and managing tenants, 
                please complete your KYC verification. It only takes a few minutes.
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <CheckCircle className="h-4 w-4" /> Account created
                </div>
                <div className="flex items-center gap-2 text-amber-700 font-medium">
                  <ShieldCheck className="h-4 w-4" /> KYC pending
                </div>
              </div>
              <button
                onClick={() => {
                  setDismissedWelcome(true)
                  setStep("upload")
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Start Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === "overview" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {verification ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Full Name</p>
                  <p className="mt-1 font-semibold text-slate-900">{verification.full_name || "—"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">ID Number</p>
                  <p className="mt-1 font-semibold text-slate-900 font-mono">{verification.id_number || "—"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Submitted</p>
                  <p className="mt-1 font-semibold text-slate-900">{new Date(verification.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>

              {verification.status === "pending" && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-medium text-amber-800">Your verification is under review.</p>
                  <p className="mt-1 text-sm text-amber-700">Our team will review your documents within 24-48 hours. You will be notified once a decision is made.</p>
                </div>
              )}

              {verification.status === "rejected" && verification.rejection_reason && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="font-medium text-rose-800">Verification Rejected</p>
                  <p className="mt-1 text-sm text-rose-700">Reason: {verification.rejection_reason}</p>
                  <button
                    onClick={() => setStep("upload")}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Resubmit
                  </button>
                </div>
              )}

              {verification.status === "more_info" && (
                <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="font-medium text-sky-800">More Information Needed</p>
                  <p className="mt-1 text-sm text-sky-700">Please update your submission with the requested information.</p>
                  <button
                    onClick={() => setStep("upload")}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Update Submission
                  </button>
                </div>
              )}

              {verification.status === "approved" && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-medium text-emerald-800">Verification Approved</p>
                  <p className="mt-1 text-sm text-emerald-700">You now have full access to all landlord features.</p>
                </div>
              )}

              {verification.status !== "approved" && (
              <div className="mt-6 grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-500">ID Front</p>
                  <img src={verification.id_front_url} alt="ID Front" className="mt-2 rounded-lg border border-slate-200 max-h-48 w-full object-cover" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-500">ID Back</p>
                  <img src={verification.id_back_url} alt="ID Back" className="mt-2 rounded-lg border border-slate-200 max-h-48 w-full object-cover" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-500">Selfie</p>
                  <img src={verification.selfie_url} alt="Selfie" className="mt-2 rounded-lg border border-slate-200 max-h-48 w-full object-cover" />
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <ShieldCheck className="mx-auto h-16 w-16 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Not Verified</h2>
              <p className="mt-2 text-slate-500">Complete KYC verification to unlock all landlord features.</p>
              <button
                onClick={() => setStep("upload")}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Start Verification
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
            <p className="mt-1 text-sm text-slate-500">Please upload clear photos of your ID (front and back) and a selfie holding the ID.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <ImageUpload label="ID Front" file={idFront} onChange={(f) => handleImageChange("idFront", f)} />
              <ImageUpload label="ID Back" file={idBack} onChange={(f) => handleImageChange("idBack", f)} />
              <ImageUpload label="Selfie" file={selfie} onChange={(f) => handleImageChange("selfie", f)} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="12345678"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name (as on ID)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional information for the verification team..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("overview")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Submit for Verification"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
