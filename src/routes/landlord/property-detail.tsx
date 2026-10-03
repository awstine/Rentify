import { useEffect, useState } from "react"
import { useLoaderData, useRevalidator, useRouteLoaderData } from "react-router-dom"
import { Building2, CircleAlert, DoorOpen, MapPin, Plus, Users, Wrench, Clock, ArrowLeft, QrCode, Copy, Download } from "lucide-react"
import { AddRoomModal } from "../../components/AddRoomModal"
import { UtilitiesManager } from "../../components/UtilitiesManager"
import { TeamPanel } from "../../components/TeamPanel"
import { getMyMembershipForProperty } from "../../lib/team"
import type { TeamPermissions, TeamMemberRole } from "../../types/domain"
import { propertyDetailLoader } from "../../lib/loaders/landlord"
import { createPropertyCode, createRoomCode } from "../../lib/codes"
import type { Property, RoomStatus } from "../../types/domain"

export { propertyDetailLoader }

type Tenant = { id: string; status: string; monthly_rent: number; start_date: string; profiles?: { full_name?: string | null; email?: string | null; phone_number?: string | null; id_number?: string | null; kra_pin?: string | null } | null; rooms?: { room_number?: string | null } | null }
type DetailTab = "overview" | "rooms" | "tenants" | "maintenance" | "utilities" | "team"

const statusStyles: Record<RoomStatus, { label: string; className: string; icon: typeof DoorOpen }> = {
  available: { label: "Available", className: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: DoorOpen },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-amber-100", icon: Clock },
  occupied: { label: "Occupied", className: "bg-sky-50 text-sky-700 ring-sky-100", icon: Building2 },
  reserved: { label: "Reserved", className: "bg-amber-50 text-amber-700 ring-amber-100", icon: CircleAlert },
  maintenance: { label: "Maintenance", className: "bg-rose-50 text-rose-700 ring-rose-100", icon: Wrench },
}

export default function PropertyDetailScreen() {
  const { property, tenants: loadedTenants } = useLoaderData() as { property: Property; tenants: Tenant[] }
  const tenants = loadedTenants || []
  const { role: activeRole } = (useRouteLoaderData("landlord") || {}) as { role?: string }
  const isOwner = activeRole === "landlord"
  const revalidator = useRevalidator()
  const [activeTab, setActiveTab] = useState<DetailTab>("overview")
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false)
  const [propertyCodeModal, setPropertyCodeModal] = useState<{ code: string; joinUrl: string } | null>(null)
  const [roomCodeModal, setRoomCodeModal] = useState<{ roomId: string; roomNumber: string; code: string; joinUrl: string } | null>(null)
  const rooms = property.rooms || []

  // Load the current user's membership so tabs honor exact granted privileges
  const [membership, setMembership] = useState<{ role: "owner" | TeamMemberRole; permissions?: TeamPermissions } | null>(
    isOwner ? { role: "owner" as const } : null
  )
  useEffect(() => {
    if (isOwner) return
    getMyMembershipForProperty(property.id).then((m) => setMembership(m))
  }, [property.id, isOwner])

  const perms = isOwner ? undefined : membership?.permissions
  const detailTabs: DetailTab[] = isOwner
    ? ["overview", "rooms", "tenants", "maintenance", "utilities", "team"]
    : [
        "overview",
        ...(perms?.view_property ? (["rooms", "tenants"] as DetailTab[]) : []),
        ...(perms?.handle_maintenance ? (["maintenance"] as DetailTab[]) : []),
        ...(perms?.edit_utilities ? (["utilities"] as DetailTab[]) : []),
        ...(perms?.manage_team ? (["team"] as DetailTab[]) : []),
      ]
  const counts = rooms.reduce<Record<RoomStatus, number>>((summary, room) => ({ ...summary, [room.status]: (summary[room.status] || 0) + 1 }), { available: 0, pending: 0, occupied: 0, reserved: 0, maintenance: 0 } as Record<RoomStatus, number>)

  const [propertyQrDataUrl, setPropertyQrDataUrl] = useState<string | null>(null)
  const [roomQrDataUrl, setRoomQrDataUrl] = useState<string | null>(null)
  const [generatingPropertyQr, setGeneratingPropertyQr] = useState(false)
  const [generatingRoomQr, setGeneratingRoomQr] = useState(false)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/landlord/properties" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 block w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to properties
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{property.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-slate-500">
            <MapPin className="h-4 w-4" /> {property.location}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
          <button
            onClick={async () => {
              const result = await createPropertyCode({ property_id: property.id })
              if (result) {
                const joinUrl = `${window.location.origin}/join/property/${result.code}`
                setPropertyCodeModal({ code: result.code, joinUrl })
                setPropertyQrDataUrl(null)
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
          >
            <QrCode className="h-4 w-4" /> Property QR
          </button>
        )}
          {isOwner && (
          <button
            onClick={() => setIsAddRoomOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" /> Add Room
          </button>
        )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Object.entries(counts).map(([status, count]) => {
          const config = statusStyles[status as RoomStatus]
          return (
            <div key={status} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{config.label}</p>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {detailTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "rooms" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Rooms ({rooms.length})</h2>
{isOwner && (
            <button onClick={() => setIsAddRoomOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
              <Plus className="h-3.5 w-3.5" /> Add Room
            </button>
)}
          </div>
          <div className="divide-y divide-slate-100">
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <DoorOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 font-medium">No rooms yet</p>
                <p className="text-sm">Add your first room to get started.</p>
              </div>
            ) : (
              rooms.map((room) => {
                const style = statusStyles[room.status]
                return (
                  <div key={room.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <DoorOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Room {room.room_number}</p>
                        <p className="text-sm text-slate-500">KES {Number(room.monthly_rent).toLocaleString()}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.className}`}>
                        {style.label}
                      </span>
                      {isOwner && room.status === "available" && (
                        <button
                          onClick={() => {
                            createRoomCode({ room_id: room.id }).then(result => {
                              if (result) {
                                const joinUrl = `${window.location.origin}/join/room/${result.code}`
                                setRoomCodeModal({ roomId: room.id, roomNumber: room.room_number, code: result.code, joinUrl })
                                setRoomQrDataUrl(null)
                              }
                            })
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800"
                        >
                          <QrCode className="h-3.5 w-3.5" /> QR
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {activeTab === "tenants" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Tenants ({tenants.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {tenants.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 font-medium">No tenants yet</p>
              </div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-900">{t.profiles?.full_name || "Unnamed"}</p>
                    <p className="text-sm text-slate-500">Room {(t as any).rooms?.room_number || "—"} · KES {Number(t.monthly_rent).toLocaleString()}/mo</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === "overview" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Property Overview</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Property Name</p>
              <p className="mt-1 font-semibold text-slate-900">{property.name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Location</p>
              <p className="mt-1 font-semibold text-slate-900">{property.location}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Total Rooms</p>
              <p className="mt-1 font-semibold text-slate-900">{rooms.length}</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "maintenance" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <Wrench className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">Maintenance requests will appear here</p>
        </section>
      )}
{activeTab === "utilities" && (
        <UtilitiesManager propertyId={property.id} rooms={rooms} />
      )}

      {activeTab === "team" && (
        <TeamPanel propertyId={property.id} />
      )}

      {/* Property QR Modal */}
      {propertyCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setPropertyCodeModal(null); setPropertyQrDataUrl(null) }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Property QR — {property.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Share this code or QR with a tenant to let them book a room.</p>
              </div>
              <button type="button" onClick={() => { setPropertyCodeModal(null); setPropertyQrDataUrl(null) }} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">×</button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              {propertyQrDataUrl ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img src={propertyQrDataUrl} alt="Property QR code" className="h-48 w-48" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setGeneratingPropertyQr(true)
                    try {
                      const dataUrl = await import("qrcode").then(m => m.default.toDataURL(propertyCodeModal.joinUrl, { width: 320, margin: 2 }))
                      setPropertyQrDataUrl(dataUrl)
                    } catch (error) {
                      console.error("Failed to generate QR:", error)
                    } finally {
                      setGeneratingPropertyQr(false)
                    }
                  }}
                  disabled={generatingPropertyQr}
                  className="flex h-48 w-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
                >
                  <QrCode className="h-10 w-10" />
                  <span className="mt-2 text-sm font-semibold">{generatingPropertyQr ? "Generating..." : "Tap to Generate QR"}</span>
                </button>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Invitation code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">{propertyCodeModal.code}</code>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(propertyCodeModal.code); alert("Copied!") }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  {propertyQrDataUrl && (
                    <button type="button" onClick={() => { const link = document.createElement("a"); link.href = propertyQrDataUrl; link.download = `${property.name.toLowerCase().replace(/\s+/g, "-")}-qrcode.png`; link.click() }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5" /> Save
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room QR Modal */}
      {roomCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setRoomCodeModal(null); setRoomQrDataUrl(null) }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Room QR — {roomCodeModal.roomNumber}</h2>
                <p className="mt-1 text-sm text-slate-500">Share this code or QR with a tenant to let them book this specific room.</p>
              </div>
              <button type="button" onClick={() => { setRoomCodeModal(null); setRoomQrDataUrl(null) }} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">×</button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              {roomQrDataUrl ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img src={roomQrDataUrl} alt="Room QR code" className="h-48 w-48" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setGeneratingRoomQr(true)
                    try {
                      const dataUrl = await import("qrcode").then(m => m.default.toDataURL(roomCodeModal.joinUrl, { width: 320, margin: 2 }))
                      setRoomQrDataUrl(dataUrl)
                    } catch (error) {
                      console.error("Failed to generate QR:", error)
                    } finally {
                      setGeneratingRoomQr(false)
                    }
                  }}
                  disabled={generatingRoomQr}
                  className="flex h-48 w-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
                >
                  <QrCode className="h-10 w-10" />
                  <span className="mt-2 text-sm font-semibold">{generatingRoomQr ? "Generating..." : "Tap to Generate QR"}</span>
                </button>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Invitation code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-widest text-slate-800 ring-1 ring-slate-200">{roomCodeModal.code}</code>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(roomCodeModal.code); alert("Copied!") }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  {roomQrDataUrl && (
                    <button type="button" onClick={() => { const link = document.createElement("a"); link.href = roomQrDataUrl; link.download = `room-${roomCodeModal.roomNumber.toLowerCase()}-qrcode.png`; link.click() }} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5" /> Save
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddRoomModal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} onSuccess={() => revalidator.revalidate()} propertyId={property.id} />
    </div>
  )
}
