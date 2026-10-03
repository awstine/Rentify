import { Link, useLoaderData, useNavigate } from "react-router-dom"
import { useState } from "react"
import { Building2, MapPin, Loader2, AlertCircle, CheckCircle, Key, ShieldCheck } from "lucide-react"
import { roomJoinLoader } from "../../lib/loaders/join"
import { assignRoomCode } from "../../lib/codes"
import { supabase } from "../../lib/supabase"
import { RoomCostBreakdownCard } from "../../components/RoomCostBreakdownCard"
import type { Property, PropertyUtility, RoomStatus, RoomUtility } from "../../types/domain"

export { roomJoinLoader }

type Room = {
  id: string
  room_number: string
  monthly_rent: number
  status: RoomStatus
  deposit_months?: number
  property_id: string
  properties: Property
}

type LoaderData = {
  code: string
  room: Room
  property: Property
  roomCodeStatus: string
  isAuthenticated: boolean
  user: any
  isAssignedToOther: boolean
  isAssignedToSelf: boolean
  utilities: PropertyUtility[]
  roomUtilities: Record<string, RoomUtility[]>
}

export default function RoomJoinScreen() {
  const { code, room, property, roomCodeStatus, isAuthenticated, user, isAssignedToOther, isAssignedToSelf, utilities, roomUtilities } = useLoaderData() as LoaderData
  const navigate = useNavigate()
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(window.location.href)

  // Handle both Supabase auth user (id) and tenant session (tenantId)
  const currentUserId = user?.id ?? user?.tenantId

  const handleAcceptAssignment = async () => {
    if (!currentUserId) {
      sessionStorage.setItem("pendingRoomAssignment", room.id)
      navigate("/signup?redirect=/join/room/" + code + "&assign=true")
      return
    }

    setAssigning(true)
    try {
      const success = await assignRoomCode(code, currentUserId)
      if (success) {
        await supabase.from("rooms").update({ tenant_id: currentUserId }).eq("id", room.id)
        setMessage({ type: "success", text: "Room assigned to you! The landlord will contact you with lease details." })
      } else {
        setMessage({ type: "error", text: "Failed to assign room. Please try again." })
      }
    } catch (_error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." })
    } finally {
      setAssigning(false)
    }
  }

  const isAvailable = roomCodeStatus === "available"

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-base font-bold text-white">R</div>
            <span className="text-lg font-bold">Rentify</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/landlord/properties" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                Landlord Dashboard
              </Link>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-4xl w-full px-5 py-8 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${isAvailable ? "bg-emerald-50 text-emerald-700"
                  : isAssignedToSelf ? "bg-sky-50 text-sky-700"
                  : isAssignedToOther ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"}`}>
                  {isAvailable ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" /> Available for assignment
                    </>
                  ) : isAssignedToSelf ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" /> Assigned to you
                    </>
                  ) : isAssignedToOther ? (
                    <>
                      <Key className="h-3.5 w-3.5" /> Assigned to another tenant
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" /> Not available
                    </>
                  )}
                </span>
                <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Room {room.room_number}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-slate-500">
                  <Building2 className="h-4 w-4" /> {property.name}
                  <MapPin className="h-4 w-4" /> {property.location}
                </p>
                <p className="mt-2 text-sm text-slate-400">Monthly rent: <span className="font-semibold text-slate-900">KES {Number(room.monthly_rent).toLocaleString()}</span></p>
                <p className="mt-1 text-sm text-slate-400">Invitation code: <code className="font-mono text-slate-600">{code}</code></p>
              </div>
              <div className="shrink-0">
                <img src={qrUrl} alt="Room QR code" className="h-28 w-28 rounded-lg border border-slate-200" />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {isAssignedToSelf ? (
              <div className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">This room is assigned to you</h2>
                <p className="mt-2 text-slate-500">The landlord will reach out with lease details and move-in instructions.</p>
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
                  <p className="font-semibold text-slate-900">Next steps:</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc list-inside">
                    <li>Wait for the landlord to send the lease agreement</li>
                    <li>Review and sign the lease</li>
                    <li>Pay the deposit and first month rent</li>
                    <li>Schedule move-in date</li>
                  </ul>
                </div>
              </div>
            ) : isAssignedToOther ? (
              <div className="text-center">
                <Key className="mx-auto h-16 w-16 text-amber-600" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Already assigned</h2>
                <p className="mt-2 text-slate-500">This room has already been assigned to another tenant.</p>
                <p className="mt-1 text-sm text-slate-400">Contact the landlord if you believe this is an error.</p>
              </div>
            ) : isAvailable ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Accept this room assignment</p>
                      <p className="mt-1 text-sm text-slate-500">
                        By accepting, you confirm interest in Room {room.room_number} at {property.name} for KES {Number(room.monthly_rent).toLocaleString()}/month.
                        The landlord will be notified and will contact you with the lease agreement.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <RoomCostBreakdownCard
                    room={room}
                    utilities={utilities}
                    roomUtilities={roomUtilities[room.id] || []}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAcceptAssignment}
                  disabled={assigning}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Key className="h-5 w-5" />
                      Accept & Assign Room to Me
                    </>
                  )}
                </button>

                {!isAuthenticated && (
                  <p className="mt-4 text-center text-sm text-slate-500">
                    You will be prompted to sign up or sign in before the assignment is confirmed.
                  </p>
                )}

                {message && (
                  <div className={`mt-4 rounded-lg p-4 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {message.text}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-rose-600" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Not available</h2>
                <p className="mt-2 text-slate-500">This room cannot be assigned at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-slate-500">
          \u00a9 {new Date().getFullYear()} Rentify \u2014 Property OS
        </div>
      </footer>
    </div>
  )
}
