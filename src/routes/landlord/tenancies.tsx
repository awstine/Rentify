import { useLoaderData } from "react-router-dom"
import { tenanciesLoader } from "../../lib/loaders/landlord"
import { VerificationGate } from "../../components/VerificationGate"

export { tenanciesLoader }

function LandlordTenanciesScreen() {
  const { tenancies } = useLoaderData() as { tenancies: any[] }

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to view and manage tenancies.">
      <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Active Tenancies</h1>
              <p className="text-gray-600 mt-1">Manage tenant lease agreements and billing days</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Property & Room</th>
                  <th className="px-6 py-4">Rent (KES)</th>
                  <th className="px-6 py-4">Billing Day</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenancies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No tenancies active yet.
                    </td>
                  </tr>
                ) : (
                  tenancies.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {t.profiles?.full_name || "N/A"}
                        <span className="block text-xs font-normal text-gray-400">{t.profiles?.phone_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        {t.rooms?.properties?.name} - Unit {t.rooms?.room_number}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        KES {t.monthly_rent?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">Every {t.billing_day}th</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </VerificationGate>
  )
}

export default LandlordTenanciesScreen
