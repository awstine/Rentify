import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useVerification } from "../lib/verification-context"
import type { ReactNode } from "react"

interface VerificationGateProps {
  children: ReactNode
  fallbackMessage?: string
  fallbackAction?: ReactNode
}

type VerificationStatus = "pending" | "approved" | "rejected" | "more_info"

export function VerificationGate({ 
  children, 
  fallbackMessage = "Complete KYC verification to unlock this feature.",
  fallbackAction
}: VerificationGateProps) {
  const { isVerified, verificationStatus } = useVerification()

  // If verified, render children normally
  if (isVerified) {
    return <>{children}</>
  }

  // Not verified - show gated state
  const statusConfig: Record<VerificationStatus, { label: string; description: string; icon: any; className: string }> = {
    approved: {
      label: "Approved",
      description: "Your KYC verification has been approved.",
      icon: ShieldCheck,
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100"
    },
    pending: { 
      label: "Under Review", 
      description: "Your KYC documents are being reviewed by our team. This typically takes 24-48 hours.",
      icon: Loader2,
      className: "bg-amber-50 text-amber-700 ring-amber-100"
    },
    rejected: { 
      label: "Rejected", 
      description: "Your verification was rejected. Please resubmit with corrected documents.",
      icon: AlertCircle,
      className: "bg-rose-50 text-rose-700 ring-rose-100"
    },
    more_info: { 
      label: "More Info Needed", 
      description: "Additional information is required. Please update your submission.",
      icon: AlertCircle,
      className: "bg-sky-50 text-sky-700 ring-sky-100"
    },
  }

  const config = verificationStatus
    ? statusConfig[verificationStatus]
    : {
        label: "Not Started",
        description: "You need to complete KYC verification to access this feature.",
        icon: ShieldCheck,
        className: "bg-slate-50 text-slate-700 ring-slate-100",
      }
  const Icon = config.icon

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Verification Required</h2>
        <p className="mt-2 text-slate-500">{fallbackMessage}</p>
        
        <div className="mt-6 rounded-xl border p-4 text-left">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${config.className}`}>
              <Icon className="h-3.5 w-3.5" /> {config.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{config.description}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/landlord/verification"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            {verificationStatus === "pending" ? "Check Status" : "Complete Verification"}
          </Link>
          {fallbackAction}
        </div>
      </div>
    </div>
  )
}
