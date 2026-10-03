import { VerificationGate } from "../../components/VerificationGate"

export default function MaintenanceScreen() {
  return (
    <VerificationGate fallbackMessage="Complete KYC verification to access maintenance management.">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Maintenance</h1>
        <p className="mt-2 text-slate-500">This feature is coming soon.</p>
      </div>
    </VerificationGate>
  )
}
