import { Users, ShieldCheck, ArrowUpRight, Building2 } from "lucide-react"
import { Link, useLoaderData, useRouteLoaderData } from "react-router-dom"
import { adminDashboardLoader } from "../../lib/loaders/admin"
import { getTimeBasedGreeting } from "../../lib/greeting"

export { adminDashboardLoader }

const formatNumber = (n: number | null | undefined) => {
  if (n == null) return "0"
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toString()
}

export default function AdminDashboardScreen() {
  const { userName } = useRouteLoaderData("admin") as { userName: string }
  const { totalLandlords, pendingVerifications, pendingListings, pendingNotifications } = useLoaderData() as Awaited<ReturnType<typeof adminDashboardLoader>>
  const greeting = getTimeBasedGreeting(userName)

  const stats = [
    { label: "Total Landlords", value: formatNumber(totalLandlords), icon: Users, tone: "text-violet-700 bg-violet-50" },
    { label: "Pending Verification", value: pendingVerifications.toString(), icon: ShieldCheck, tone: "text-amber-700 bg-amber-50" },
    { label: "Pending Listings", value: pendingListings.toString(), icon: Building2, tone: "text-amber-700 bg-amber-50" },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-0.5 text-sm text-slate-500">System overview and administrative controls.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <section key={label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{value}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">KYC Verification</h2>
            <Link to="/admin/verification" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
              View Queue <ArrowUpRight className="h-4 w-4 inline" />
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-500">{pendingVerifications} landlords awaiting KYC review.</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Listing Requests</h2>
            <Link to="/admin/listings" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
              Review Queue <ArrowUpRight className="h-4 w-4 inline" />
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-500">{pendingListings} property listings awaiting approval.</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            <Link to="/admin/notifications" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
              View All <ArrowUpRight className="h-4 w-4 inline" />
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-500">{pendingNotifications} pending notifications in queue.</p>
        </section>
      </div>
    </div>
  )
}