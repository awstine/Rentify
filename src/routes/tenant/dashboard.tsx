import { useLoaderData } from "react-router-dom"
import { Link } from "react-router-dom"
import { Building2, CreditCard, CalendarClock, Key, ShieldCheck, ExternalLink } from "lucide-react"
import { tenantDashboardLoader } from "../../lib/loaders/tenant"
import type { Property, Room } from "../../types/domain"
import { getTimeBasedGreeting } from "../../lib/greeting"

export { tenantDashboardLoader }

type LoaderData = {
  room: (Room & { properties: Property; room_codes: { code: string; status: string }[] }) | null
  property: Property | null
  tenancy: any
  isAssigned: boolean
  userName: string
  tenantId: string | null
}

export default function TenantDashboardScreen() {
  const { room, property, tenancy, isAssigned, userName } = useLoaderData() as LoaderData
  const greeting = getTimeBasedGreeting(userName)

  if (!isAssigned || !room || !property) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}</h1>
          <p className="mt-1 text-slate-500">Welcome to your tenant portal.</p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No room assigned yet</h2>
          <p className="mt-2 text-slate-500">You don\'t have an active room assignment.</p>
          <p className="mt-1 text-sm text-slate-400">Ask your landlord to send you a room invitation code.</p>
          <div className="mt-6">
            <a
              href="https://wa.me/254700000000?text=Hello%2C%20I%27d%20like%20a%20room%20invitation%20code%20please."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Contact Support
            </a>
          </div>
        </section>
      </div>
    )
  }

  const roomCode = room.room_codes?.[0]?.code ?? "—"

  const waUrl = "https://wa.me/254700000000?text=Hello%2C%20I%27d%20like%20to%20discuss%20my%20room%20at%20" + encodeURIComponent(property.name)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-500">Your room at {property.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Room</p>
              <p className="font-bold text-slate-900">Room {room.room_number}</p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly rent</p>
              <p className="font-bold text-slate-900">KES {Number(room.monthly_rent).toLocaleString()}</p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Lease status</p>
              <p className="font-bold text-slate-900 capitalize">{tenancy?.status ?? "pending"}</p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Room code</p>
              <p className="font-bold text-slate-900 font-mono">{roomCode}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Message Landlord</p>
                <p className="text-sm text-slate-500">Chat on WhatsApp</p>
              </div>
            </a>
            <Link
              to="/tenant/invoices"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">View Invoices</p>
                <p className="text-sm text-slate-500">Check payment status</p>
              </div>
            </Link>
            <Link
              to="/tenant/maintenance"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Maintenance</p>
                <p className="text-sm text-slate-500">Report an issue</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Property Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Property</p>
              <p className="mt-1 font-semibold text-slate-900">{property.name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Location</p>
              <p className="mt-1 font-semibold text-slate-900">{property.location}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Room Number</p>
              <p className="mt-1 font-semibold text-slate-900">{room.room_number}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Monthly Rent</p>
              <p className="mt-1 font-semibold text-slate-900">KES {Number(room.monthly_rent).toLocaleString()}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
