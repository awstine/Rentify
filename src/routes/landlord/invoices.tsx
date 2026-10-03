import { useLoaderData } from "react-router-dom"
import { invoicesLoader } from "../../lib/loaders/landlord"
import { VerificationGate } from "../../components/VerificationGate"

export { invoicesLoader }

function LandlordInvoicesScreen() {
  const { invoices } = useLoaderData() as { invoices: any[] }

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to view and manage invoices.">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-slate-500">Track and manage all tenant invoices.</p>
        </div>

        {invoices.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-medium text-slate-700">No invoices yet</p>
            <p className="mt-1 text-sm text-slate-500">Invoices are generated automatically from active leases.</p>
          </section>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Property / Room</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">{inv.profiles?.full_name || "—"}</td>
                    <td className="px-4 py-3">{inv.properties?.name} / Room {inv.rooms?.room_number}</td>
                    <td className="px-4 py-3">{new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold">KES {Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </VerificationGate>
  )
}

export default LandlordInvoicesScreen
