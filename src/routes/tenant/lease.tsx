import { Download } from 'lucide-react'

export default function TenantLeaseScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="text-[2.5rem] font-black tracking-[-0.06em] text-slate-800">My Lease</h1>
      <p className="mt-2 text-xl text-slate-500">Your tenancy agreement details.</p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-700">WK</div>
            <div>
              <div className="text-3xl font-bold tracking-[-0.05em] text-slate-800">Wanjiru Kamau</div>
              <div className="mt-1 text-lg text-slate-500">Kilimani Heights · Room A101</div>
            </div>
          </div>

          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Download lease
          </button>
        </div>

        <div className="mt-7 flex items-center gap-2 text-lg font-semibold text-emerald-700">
          <span className="h-3 w-3 rounded-full bg-emerald-500" /> Active
        </div>

        <div className="mt-8 grid gap-4 border-t border-slate-200 pt-8 md:grid-cols-4">
          {[
            ['Start date', '15 Jan 2025'],
            ['End date', '14 Jan 2026'],
            ['Monthly rent', 'KES 40,000'],
            ['Deposit', 'KES 40,000'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs font-bold tracking-[0.18em] text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-xl leading-relaxed text-slate-600">
          12-month tenancy, 1-month notice required, no subletting permitted. Rent due on the 5th of each month. Late fee of KES 2,000 applies after 5-day grace period.
        </div>
      </div>
    </div>
  )
}
