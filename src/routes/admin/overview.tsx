import { Users, ShieldCheck, CreditCard, Settings } from "lucide-react"
import { useLoaderData } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export async function overviewLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Response("Unauthorized", { status: 401 })

  const [usersResult, landlordsResult, tenantsResult, verificationsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "landlord"),
    supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "tenant"),
    supabase.from("landlord_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  return {
    totalUsers: usersResult.count || 0,
    totalLandlords: landlordsResult.count || 0,
    totalTenants: tenantsResult.count || 0,
    pendingVerifications: verificationsResult.count || 0,
  }
}

const formatNumber = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toString()
}

export default function AdminOverviewScreen() {
  const { totalUsers, totalLandlords, totalTenants, pendingVerifications } = useLoaderData() as Awaited<ReturnType<typeof overviewLoader>>

  const metrics = [
    { label: "Total Users", value: formatNumber(totalUsers), tone: "bg-violet-50 text-violet-700", icon: Users },
    { label: "Landlords", value: formatNumber(totalLandlords), tone: "bg-emerald-50 text-emerald-700", icon: ShieldCheck },
    { label: "Tenants", value: formatNumber(totalTenants), tone: "bg-sky-50 text-sky-700", icon: Users },
    { label: "Pending Verification", value: pendingVerifications.toString(), tone: "bg-amber-50 text-amber-700", icon: ShieldCheck, badge: pendingVerifications > 0 ? "Review needed" : "" },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="text-[2.6rem] font-black tracking-[-0.06em] text-slate-800">Platform Overview</h1>
      <p className="mt-2 text-xl text-slate-500">System-wide monitoring of the Rentify platform.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, tone, icon: Icon, badge }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              {badge ? <span className="text-sm font-semibold text-emerald-700">{badge}</span> : null}
            </div>
            <div className="mt-5 text-lg text-slate-500">{label}</div>
            <div className="mt-4 text-[2.3rem] font-bold tracking-[-0.06em] text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-[2rem] font-bold tracking-[-0.05em] text-slate-800">User Growth</h2>
          <p className="mt-2 text-lg text-slate-500">Platform user registrations over time</p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <svg viewBox="0 0 700 220" className="h-60 w-full">
              <defs>
                <linearGradient id="fillViolet" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <g>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((line) => (
                  <line key={line} x1="0" y1={20 + line * 32} x2="700" y2={20 + line * 32} stroke="#dfe7ee" strokeDasharray="3 6" />
                ))}
                <path d="M0 170 C 90 140, 140 160, 180 120 S 310 70, 350 82 S 470 110, 492 90 S 570 60, 620 68 S 670 96, 700 80 L700 220 L0 220 Z" fill="url(#fillViolet)" />
                <path d="M0 170 C 90 140, 140 160, 180 120 S 310 70, 350 82 S 470 110, 492 90 S 570 60, 620 68 S 670 96, 700 80" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                {[12, 18, 24, 32, 28, 38, 45, 52, 58, 65, 72, 80].map((value, index) => {
                  const x = index * 58 + 18
                  const y = 180 - value * 2
                  return <circle key={index} cx={x} cy={y} r="4" fill="#8b5cf6" />
                })}
              </g>
            </svg>

            <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
              {["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-[2rem] font-bold tracking-[-0.05em] text-slate-800">Quick Actions</h2>
          <p className="mt-2 text-lg text-slate-500">Common administrative tasks</p>

          <div className="mt-8 space-y-3">
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-violet-200 hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Verification Queue</div>
                  <div className="text-sm text-slate-500">{pendingVerifications} pending review</div>
                </div>
              </div>
              <span className="text-violet-700 font-medium">Go ?</span>
            </button>

            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-violet-200 hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Manage Users</div>
                  <div className="text-sm text-slate-500">{totalUsers} total users</div>
                </div>
              </div>
              <span className="text-violet-700 font-medium">Go ?</span>
            </button>

            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-violet-200 hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Platform Revenue</div>
                  <div className="text-sm text-slate-500">View fee reports</div>
                </div>
              </div>
              <span className="text-violet-700 font-medium">Go ?</span>
            </button>

            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-violet-200 hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">System Settings</div>
                  <div className="text-sm text-slate-500">Configure platform</div>
                </div>
              </div>
              <span className="text-violet-700 font-medium">Go ?</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

