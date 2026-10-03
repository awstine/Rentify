
const invoices = [
  { month: 'July 2026', due: 'Due 05 Jul 2026', amount: 'KES 40,000', status: 'Paid' },
  { month: 'June 2026', due: 'Due 05 Jun 2026', amount: 'KES 40,000', status: 'Paid' },
]

export default function TenantRentScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="text-[2.5rem] font-black tracking-[-0.06em] text-slate-800">Pay Rent</h1>
      <p className="mt-2 text-xl text-slate-500">Settle your outstanding balance via M-Pesa.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-800">Current balance</h2>
          <p className="mt-2 text-lg text-slate-500">All settled</p>
          <div className="mt-12 flex min-h-40 items-center justify-center text-center text-xl text-slate-500">
            You have no outstanding balance. Thank you!
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold tracking-[-0.05em] text-slate-800">Recent invoices</h2>
          <div className="mt-8 space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.month} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <div className="text-lg font-semibold text-slate-700">{invoice.month}</div>
                  <div className="text-sm text-slate-500">{invoice.due}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-800">{invoice.amount}</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
