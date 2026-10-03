import { Download } from 'lucide-react'

const invoices = [
  { period: 'July 2026', amount: 'KES 40,000', balance: '—', due: '05 Jul 2026', status: 'Paid' },
  { period: 'June 2026', amount: 'KES 40,000', balance: '—', due: '05 Jun 2026', status: 'Paid' },
]

export default function TenantInvoicesScreen() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="text-[2.5rem] font-black tracking-[-0.06em] text-slate-800">My Invoices</h1>
      <p className="mt-2 text-xl text-slate-500">Monthly rent bills and payment status.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-sm uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Period</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Balance</th>
              <th className="px-6 py-4 font-semibold">Due</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.period} className="border-t border-slate-200 text-lg text-slate-700">
                <td className="px-6 py-5 font-medium">{invoice.period}</td>
                <td className="px-6 py-5">{invoice.amount}</td>
                <td className="px-6 py-5">{invoice.balance}</td>
                <td className="px-6 py-5">{invoice.due}</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button type="button" className="text-emerald-700 hover:text-emerald-800" aria-label={`Download ${invoice.period} invoice`}>
                    <Download className="ml-auto h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
