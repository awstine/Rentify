import { BookText, CircleDollarSign, FileText, ShieldCheck, Wrench, Wallet } from 'lucide-react'

const stats = [
  { label: 'Outstanding balance', value: 'KES 0', hint: 'All settled', color: 'bg-emerald-50', icon: Wallet },
  { label: 'Paid this year', value: 'KES 80k', hint: '', color: 'bg-emerald-50', icon: CircleDollarSign },
  { label: 'Open requests', value: '0', hint: '', color: 'bg-emerald-50', icon: Wrench },
]

const actions = [
  { label: 'Pay rent', icon: Wallet },
  { label: 'My invoices', icon: FileText },
  { label: 'Report issue', icon: Wrench },
  { label: 'My lease', icon: BookText },
]

export default function TenantHomeScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-8">
        <h1 className="text-[2.3rem] font-black tracking-[-0.06em] text-slate-800">Welcome back, Wanjiru</h1>
        <p className="mt-2 text-xl text-slate-500">Your tenancy at Kilimani Heights, Room A01.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-lg text-slate-500">{label}</p>
            <p className="mt-4 text-4xl font-bold tracking-[-0.05em] text-slate-800">{value}</p>
            {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {actions.map(({ label, icon: Icon }) => (
          <button key={label} type="button" className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-lg font-medium text-slate-700">{label}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-800">Next payment</h2>
          <p className="mt-2 text-lg text-slate-500">July 2026</p>

          <div className="mt-8 space-y-5">
            <div className="flex items-center justify-between text-lg">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-800">KES 40,000</span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span className="text-slate-500">Due date</span>
              <span className="font-semibold text-slate-800">05 Jul 2026</span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span className="text-slate-500">Status</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Paid
              </span>
            </div>
          </div>

          <button type="button" className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700">
            <Wallet className="h-4 w-4" /> Pay with M-Pesa
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-800">Payment history</h2>
            <button type="button" className="text-lg font-semibold text-emerald-700">View all →</button>
          </div>

          <div className="space-y-5">
            {[{ date: '29 Jul 2026', ref: 'QGH7KX2P9L', amount: '+KES 40,000', status: 'Paid' }, { date: '04 Jun 2026', ref: 'QGH3UV1W4X', amount: '+KES 40,000', status: 'Paid' }].map((item) => (
              <div key={item.ref} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-medium text-slate-700">M-Pesa payment</div>
                    <div className="text-sm text-slate-500">{item.ref} • {item.date}</div>
                  </div>
                </div>
                <div className="font-semibold text-emerald-600">{item.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
