import { Wrench } from 'lucide-react'

export default function TenantMaintenanceScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.5rem] font-black tracking-[-0.06em] text-slate-800">Maintenance Requests</h1>
          <p className="mt-2 text-xl text-slate-500">Report and track repair issues for your unit.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700">
          <Wrench className="h-4 w-4" /> New request
        </button>
      </div>

      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl text-slate-500 shadow-sm">
        No maintenance requests yet.
      </div>
    </div>
  )
}
