import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { DoorOpen } from "lucide-react"
import { bookingRequestsLoader } from "../../lib/loaders/landlord"
import { approveBookingRequest, rejectBookingRequest } from "../../lib/booking"
import { VerificationGate } from "../../components/VerificationGate"
import type { BookingRequest } from "../../types/domain"

export { bookingRequestsLoader }

export default function BookingRequestsScreen() {
  const { requests } = useLoaderData() as { requests: BookingRequest[] }
  const revalidator = useRevalidator()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (request: BookingRequest) => {
    if (!window.confirm(`Approve request from ${request.guest_name} for Room ${request.rooms?.room_number}?`)) return
    setProcessingId(request.id)
    const result = await approveBookingRequest(request.id)
    setProcessingId(null)
    if (result.success) {
      revalidator.revalidate()
    } else {
      alert(result.error || "Failed to approve")
    }
  }

  const handleReject = async (request: BookingRequest) => {
    if (!window.confirm(`Reject request from ${request.guest_name}?`)) return
    setProcessingId(request.id)
    const result = await rejectBookingRequest(request.id)
    setProcessingId(null)
    if (result.success) {
      revalidator.revalidate()
    } else {
      alert(result.error || "Failed to reject")
    }
  }

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to view and manage booking requests.">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Booking Requests</h1>
          <p className="mt-1 text-slate-500">Review and approve pending booking requests.</p>
        </div>

        {requests.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <DoorOpen className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No booking requests</p>
            <p className="mt-1 text-sm text-slate-500">When someone requests a room via your property link, it will appear here.</p>
          </section>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <DoorOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{request.guest_name}</p>
                      <p className="text-sm text-slate-500">{request.guest_phone} &middot; Room {request.rooms?.room_number} &middot; KES {Number(request.rooms?.monthly_rent).toLocaleString()}/mo</p>
                      <p className="text-xs text-slate-400">{request.properties?.name} &middot; {request.properties?.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === "pending_approval" ? "bg-amber-50 text-amber-700" :
                      request.status === "pending_verification" ? "bg-sky-50 text-sky-700" :
                      request.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      request.status === "rejected" ? "bg-rose-50 text-rose-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {request.status.replace("_", " ")}
                    </span>
                    {request.status === "pending_approval" && (
                      <>
                        <button onClick={() => handleApprove(request)} disabled={processingId === request.id} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">Approve</button>
                        <button onClick={() => handleReject(request)} disabled={processingId === request.id} className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </VerificationGate>
  )
}
