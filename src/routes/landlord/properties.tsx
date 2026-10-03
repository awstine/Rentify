import { useState } from "react"
import { Link, useLoaderData, useRevalidator, useRouteLoaderData } from "react-router-dom"
import { ArrowUpRight, Building2, CheckCircle2, Clock, MapPin, Plus, XCircle } from "lucide-react"
import { AddPropertyModal } from "../../components/AddPropertyModal"
import { propertiesLoader } from "../../lib/loaders/landlord"
import { VerificationGate } from "../../components/VerificationGate"
import type { PropertyListingStatus } from "../../types/domain"
export { propertiesLoader }

const listingStatusConfig: Record<PropertyListingStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending Approval", className: "bg-amber-50 text-amber-700 ring-amber-100", icon: Clock },
  approved: { label: "Live", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700 ring-rose-100", icon: XCircle },
}

export default function LandlordPropertiesScreen() {
  const { properties } = useLoaderData() as Awaited<ReturnType<typeof propertiesLoader>>
  const { role: activeRole } = (useRouteLoaderData("landlord") || {}) as { role?: string }
  const canManage = activeRole === "landlord"
  const revalidator = useRevalidator()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <VerificationGate>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Portfolio</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Properties</h1>
            <p className="mt-1 text-slate-500">A clear view of every building and available unit.</p>
          </div>
          {canManage && (
          <button onClick={() => setIsModalOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800">
            <Plus className="h-4 w-4" /> Add property
          </button>
        )}
        </div>

        {properties.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Building2 className="h-6 w-6" /></div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Start your portfolio</h2>
            <p className="mt-1 text-sm text-slate-500">Add your first property and its units to begin managing it here.</p>
            {canManage && (
            <button onClick={() => setIsModalOpen(true)} className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Create your first property</button>
          )}
          </div>
        ) : (
<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => {
              const rooms = property.rooms || []
              const occupied = rooms.filter((room) => room.status === "occupied").length
              const available = rooms.filter((room) => room.status === "available").length
              const status = (property.listing_status || "approved") as PropertyListingStatus
              const statusConfig = listingStatusConfig[status]
              const StatusIcon = statusConfig.icon
              return (
                <Link key={property.id} to={`/landlord/properties/${property.id}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{property.name}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{property.location}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusConfig.className}`}>
                      <StatusIcon className="h-3 w-3" /> {statusConfig.label}
                    </span>
                  </div>

                  {status === "pending" && (
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
                      This property is waiting for admin approval and will go live once approved.
                    </p>
                  )}
                  {status === "rejected" && (
                    <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
                      Rejected: {property.rejection_reason || "No reason provided"}
                    </p>
                  )}

                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5 text-center">
                    <div><p className="text-xl font-bold text-slate-900">{rooms.length}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Units</p></div>
                    <div><p className="text-xl font-bold text-slate-900">{occupied}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Occupied</p></div>
                    <div><p className="text-xl font-bold text-emerald-700">{available}</p><p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Available</p></div>
                  </div>

                  <span className="mt-5 flex items-center gap-1 text-sm font-semibold text-emerald-700">View units <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                </Link>
              )
            })}
          </div>
        )}

        <AddPropertyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => revalidator.revalidate()} />
      </div>
    </VerificationGate>
  )
}