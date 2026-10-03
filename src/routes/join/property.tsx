import { useState, type FormEvent } from "react"
import { Link, useLoaderData } from "react-router-dom"
import { Building2, CheckCircle, DoorOpen, Loader2, MapPin, Phone } from "lucide-react"
import { propertyJoinLoader } from "../../lib/loaders/join"
import { createOtp, verifyOtp, submitBookingRequest } from "../../lib/booking"
import { RoomCostBreakdownCard } from "../../components/RoomCostBreakdownCard"
import type { Property, Room, PropertyUtility, RoomUtility } from "../../types/domain"

export { propertyJoinLoader }

export default function PropertyJoinScreen() {
  const { code, property, rooms, utilities, roomUtilities } = useLoaderData() as {
    code: string
    property: Property
    rooms: Room[]
    utilities: PropertyUtility[]
    roomUtilities: Record<string, RoomUtility[]>
  }

  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=" + encodeURIComponent(window.location.href)

  const [step, setStep] = useState<"details" | "otp" | "room">("details")
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const availableRooms = rooms.filter((room) => room.status === "available")

  const formatPhone = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "")
    return cleaned.startsWith("254") ? "0" + cleaned.slice(3) : cleaned
  }

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!guestName.trim()) {
      setError("Please enter your full name")
      return
    }
    if (formatPhone(guestPhone).length < 10) {
      setError("Enter a valid phone number")
      return
    }
    setLoading(true)
    const result = await createOtp(formatPhone(guestPhone), "booking_verification")
    setLoading(false)
    if (result.success) {
      setStep("otp")
      setSuccess("OTP sent to your phone")
    } else {
      setError(result.error || "Failed to send OTP")
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP")
      return
    }
    setLoading(true)
    const result = await verifyOtp(formatPhone(guestPhone), otp, "booking_verification")
    setLoading(false)
    if (result.success) {
      setStep("room")
      setSuccess(null)
    } else {
      setError(result.error || "Invalid OTP")
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedRoom) {
      setError("Please select a room")
      return
    }
    setLoading(true)
    const result = await submitBookingRequest(property.id, selectedRoom, guestName.trim(), formatPhone(guestPhone))
    setLoading(false)
    if (result.success) {
      setSuccess("Booking request submitted! The landlord will review it and contact you.")
    } else {
      setError(result.error || "Failed to submit request")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-base font-semibold text-white">R</div>
            <span className="text-lg font-bold">Rentify</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-4xl w-full px-5 py-8 md:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <Building2 className="h-3.5 w-3.5" /> Property invitation
                </span>
                <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{property.name}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-slate-500">
                  <MapPin className="h-4 w-4" /> {property.location}
                </p>
                <p className="mt-1 text-sm text-slate-400">Invitation code: <code className="font-mono text-slate-600">{code}</code></p>
              </div>
              <div className="shrink-0">
                <img src={qrUrl} alt="Property QR code" className="h-28 w-28 rounded-lg border border-slate-200" />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <>
              {success && step !== "room" && (
                <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {success && step === "room" && (
                <div className="text-center">
                  <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" />
                  <h2 className="mt-4 text-xl font-semibold text-slate-900">Request submitted</h2>
                  <p className="mt-2 text-slate-500">{success}</p>
                </div>
              )}

              {step === "details" && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone className="h-5 w-5" />
                      </span>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(event) => setGuestPhone(event.target.value)}
                        placeholder="0712 345 678"
                        className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending OTP...</> : "Continue"}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-slate-500 text-center">We sent a 6-digit code to <strong>{guestPhone}</strong></p>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">OTP Code</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl tracking-widest focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</> : "Verify & Continue"}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Wrong number? <button type="button" onClick={() => setStep("details")} className="text-emerald-700 font-medium hover:underline">Go back</button>
                  </p>
                </form>
              )}

              {step === "room" && !success && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="font-semibold text-slate-900">Choose an available room</p>
                    <p className="mt-1 text-sm text-slate-500">Select the unit you would like to book at {property.name}.</p>
                  </div>

                  {availableRooms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <DoorOpen className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 font-medium text-slate-700">No rooms available right now</p>
                      <p className="mt-1 text-sm text-slate-500">Check back later or contact the landlord.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableRooms.map((room) => (
                        <button
                          type="button"
                          key={room.id}
                          onClick={() => setSelectedRoom(room.id)}
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                            selectedRoom === room.id
                              ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                              : "border-slate-200 bg-white hover:border-emerald-200"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">Room {room.room_number}</p>
                            <p className="text-sm text-slate-500">KES {Number(room.monthly_rent).toLocaleString()}/mo</p>
                          </div>
                          {selectedRoom === room.id && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedRoom && (() => {
                    const selected = availableRooms.find((r) => r.id === selectedRoom)
                    if (!selected) return null
                    return (
                      <RoomCostBreakdownCard
                        room={selected}
                        utilities={utilities}
                        roomUtilities={roomUtilities[selected.id] || []}
                      />
                    )
                  })()}

                  {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || availableRooms.length === 0 || !selectedRoom}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : "Submit Booking Request"}
                  </button>
                </form>
              )}
            </>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-4 md:px-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Rentify — Property OS
        </div>
      </footer>
    </div>
  )
}
