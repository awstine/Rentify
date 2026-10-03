import { ArrowUpRight, Bell, Building2, CalendarClock, CircleAlert, CreditCard, DoorOpen, Receipt, Users, Wrench } from "lucide-react"
import { Link, useLoaderData, useRouteLoaderData } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { getRoleForUser } from "../../lib/role"
import { getMyMemberProperties } from "../../lib/team"
import { getTimeBasedGreeting } from "../../lib/greeting"
import type { Property, TeamPermissions, TeamMemberRole } from "../../types/domain"

interface MembershipSummary {
  property_id: string
  role: TeamMemberRole
  permissions: TeamPermissions
}

export async function dashboardLoader() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: "landlord" as string, properties: [] as Property[], memberships: [] as MembershipSummary[], pendingBookings: 0, maintenanceRooms: 0 }

  const role = await getRoleForUser(user.id)
  const memberships = await getMyMemberProperties()
  const memberIds = memberships.map((m) => m.property_id)

  const { data: properties, error } = await supabase
    .from("properties")
    .select("*, rooms(*)")
    .or(memberIds.length ? `landlord_id.eq.${user.id},id.in.(${memberIds.join(",")})` : `landlord_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
  if (error) console.error("Failed to fetch dashboard properties:", error.message)

  const propertyIds = (properties ?? []).map((p: any) => p.id)
  let pendingBookings = 0
  let maintenanceRooms = 0

  if (propertyIds.length > 0) {
    const { count: bookingCount } = await supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .in("property_id", propertyIds)
      .in("status", ["pending_verification", "pending_approval"])
    pendingBookings = bookingCount || 0

    const allRooms = (properties ?? []).flatMap((p: any) => p.rooms ?? [])
    maintenanceRooms = allRooms.filter((r: any) => r.status === "maintenance").length
  }

  return {
    role,
    properties: (properties ?? []) as Property[],
    memberships: memberships as MembershipSummary[],
    pendingBookings,
    maintenanceRooms,
  }
}

// Shared stat helpers
interface RoomStat { units: number; available: number; occupied: number; maintenance: number }
function roomStats(property: Property): RoomStat {
  const rooms = property.rooms || []
  return {
    units: rooms.length,
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  }
}

const fmtKES = (n: number) => "KES " + (Number.isFinite(n) ? n.toLocaleString() : "0")
export default function DashboardScreen() {
  const { userName } = useRouteLoaderData("landlord") as { userName: string }
  const greeting = getTimeBasedGreeting(userName)
  const today = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())

  const data = useLoaderData() as Awaited<ReturnType<typeof dashboardLoader>>
  const { role, properties, pendingBookings, maintenanceRooms } = data

  if (role === "agent") {
    return <AgentDashboard greeting={greeting} today={today} properties={properties} pendingBookings={pendingBookings} />
  }
  if (role === "caretaker") {
    return <CaretakerDashboard greeting={greeting} today={today} properties={properties} maintenanceRooms={maintenanceRooms} />
  }
  return <LandlordDashboard greeting={greeting} today={today} />
}

// ============================================================
// AGENT DASHBOARD
// ============================================================
function AgentDashboard({ greeting, today, properties, pendingBookings }: {
  greeting: string
  today: string
  properties: Property[]
  pendingBookings: number
}) {
  const totals = properties.reduce(
    (acc, p) => { const s = roomStats(p); return { units: acc.units + s.units, available: acc.available + s.available, occupied: acc.occupied + s.occupied } },
    { units: 0, available: 0, occupied: 0 }
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-500">{today} · Your assigned properties and showing pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned properties" value={properties.length.toString()} hint={`You can view ${properties.length} building${properties.length === 1 ? "" : "s"}`} icon={Building2} tone="text-emerald-700 bg-emerald-50" />
        <StatCard label="Available rooms" value={totals.available.toString()} hint={`${totals.units} total units`} icon={DoorOpen} tone="text-sky-700 bg-sky-50" />
        <StatCard label="Pending bookings" value={pendingBookings.toString()} hint="Awaiting your review" icon={CalendarClock} tone="text-amber-700 bg-amber-50" />
        <StatCard label="Occupied" value={totals.occupied.toString()} hint="Current tenancy" icon={Users} tone="text-violet-700 bg-violet-50" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-slate-900">Your properties</h2>
            <p className="mt-1 text-sm text-slate-500">Buildings you are assigned to and their current availability.</p>
          </div>
          <Link to="/landlord/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
            All properties <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {properties.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Building2 className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No properties assigned yet</p>
              <p className="mt-1 text-sm text-slate-500">The landlord will assign you to a property when you're added as an agent.</p>
            </div>
          ) : (
            properties.map((p) => <PropertyRow key={p.id} property={p} />)
          )}
        </div>
      </section>

      <BookingCta pendingBookings={pendingBookings} />
    </div>
  )
}
// ============================================================
// CARETAKER DASHBOARD
// ============================================================
function CaretakerDashboard({ greeting, today, properties, maintenanceRooms }: {
  greeting: string
  today: string
  properties: Property[]
  maintenanceRooms: number
}) {
  const totals = properties.reduce(
    (acc, p) => { const s = roomStats(p); return { units: acc.units + s.units, available: acc.available + s.available, occupied: acc.occupied + s.occupied } },
    { units: 0, available: 0, occupied: 0 }
  )
  const maintenanceList = properties.flatMap((p) =>
    (p.rooms || []).filter((r) => r.status === "maintenance").map((r) => ({ propertyName: p.name, room: r }))
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-500">{today} · Property operations at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned properties" value={properties.length.toString()} hint="Buildings under your care" icon={Building2} tone="text-emerald-700 bg-emerald-50" />
        <StatCard label="Total units" value={totals.units.toString()} hint="Across your properties" icon={DoorOpen} tone="text-sky-700 bg-sky-50" />
        <StatCard label="Occupied" value={totals.occupied.toString()} hint="Units with tenants" icon={Users} tone="text-violet-700 bg-violet-50" />
        <StatCard label="Maintenance" value={maintenanceRooms.toString()} hint="Units flagged for work" icon={Wrench} tone="text-amber-700 bg-amber-50" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">Maintenance queue</h2>
            <p className="mt-1 text-sm text-slate-500">Units currently flagged for repair or inspection.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {maintenanceList.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Wrench className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">All clear</p>
                <p className="mt-1 text-sm text-slate-500">No units are in maintenance right now.</p>
              </div>
            ) : (
              maintenanceList.map(({ propertyName, room }) => (
                <div key={room.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Room {room.room_number} — {propertyName}</p>
                      <p className="text-xs text-slate-400">{fmtKES(Number(room.monthly_rent))}/mo</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">Maintenance</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">Your properties</h2>
            <p className="mt-1 text-sm text-slate-500">Units and occupancy across the buildings you look after.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {properties.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Building2 className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">No properties assigned yet</p>
                <p className="mt-1 text-sm text-slate-500">The landlord will assign you to a property when you're added as a caretaker.</p>
              </div>
            ) : (
              properties.map((p) => <PropertyRow key={p.id} property={p} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
// ============================================================
// LANDLORD DASHBOARD
// ============================================================
function LandlordDashboard({ greeting, today }: {
  greeting: string
  today: string
}) {
  const metrics = [
    { label: "Revenue today", value: "KES 0", change: "Live M-Pesa collections", icon: CreditCard, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Monthly collection", value: "KES 0", change: "0% collection rate", icon: Receipt, tone: "text-sky-700 bg-sky-50" },
    { label: "Outstanding rent", value: "KES 0", change: "No unpaid invoices", icon: CircleAlert, tone: "text-amber-700 bg-amber-50" },
    { label: "Occupancy rate", value: "0%", change: "Add rooms to calculate", icon: Building2, tone: "text-violet-700 bg-violet-50" },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-500">{today} · Your rental operations at a glance.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, change, icon: Icon, tone }) => (
          <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{change}</p>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-slate-900">Recent transactions</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest M-Pesa and manual payment activity.</p>
          </div>
          <a href="/landlord/payments" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
            All transactions <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="px-6 py-14 text-center">
          <CreditCard className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No transactions yet</p>
          <p className="mt-1 text-sm text-slate-500">M-Pesa and manual payments will appear here.</p>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Recent notifications</h2>
              <p className="mt-1 text-sm text-slate-500">Updates from across your properties.</p>
            </div>
            <Bell className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">No recent notifications</p>
            <p className="mt-1 text-sm text-slate-400">Property, tenancy and payment updates will appear here.</p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Upcoming</h2>
              <p className="mt-1 text-sm text-slate-500">Tasks, inspections and lease events.</p>
            </div>
            <a href="/landlord/inspections" className="text-sm font-semibold text-emerald-700">View calendar</a>
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">Nothing scheduled</p>
            <p className="mt-1 text-sm text-slate-400">Upcoming rent cycles and inspections appear here.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
// ============================================================
// SHARED COMPONENTS
// ============================================================
function StatCard({ label, value, hint, icon: Icon, tone }: {
  label: string
  value: string
  hint: string
  icon: any
  tone: string
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </section>
  )
}

function PropertyRow({ property }: { property: Property }) {
  const s = roomStats(property)
  const rents = (property.rooms || []).map((r) => Number(r.monthly_rent)).filter((n) => Number.isFinite(n))
  const cheapest = rents.length ? Math.min(...rents) : null
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Building2 className="h-5 w-5" /></div>
        <div>
          <p className="font-semibold text-slate-900">{property.name}</p>
          <p className="text-xs text-slate-400">{property.location}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-center">
        <div><p className="text-base font-bold text-slate-900">{s.units}</p><p className="text-[11px] text-slate-400">Units</p></div>
        <div><p className="text-base font-bold text-emerald-700">{s.available}</p><p className="text-[11px] text-slate-400">Available</p></div>
        <div><p className="text-base font-bold text-sky-700">{s.occupied}</p><p className="text-[11px] text-slate-400">Occupied</p></div>
        <div><p className="text-base font-bold text-slate-900">{cheapest ? fmtKES(cheapest) : "—"}</p><p className="text-[11px] text-slate-400">From</p></div>
        <Link to={`/landlord/properties/${property.id}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
          View <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function BookingCta({ pendingBookings }: { pendingBookings: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Booking requests</h2>
          <p className="mt-1 text-sm text-slate-500">{pendingBookings} request{pendingBookings === 1 ? "" : "s"} waiting for your review.</p>
        </div>
        <Link to="/landlord/booking-requests" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
          Review requests <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}