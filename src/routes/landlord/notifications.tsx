import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Bell, Check, X, Loader2, CreditCard, ShieldCheck, CalendarClock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { getLandlordNotifications } from "../../lib/notifications"
import { VerificationGate } from "../../components/VerificationGate"

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  status: "pending" | "sent" | "failed"
  related_entity_id?: string
  created_at: string
  sent_at?: string
}

export default function LandlordNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "payment" | "verification" | "booking">("all")

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const items = await getLandlordNotifications(user.id)
        setNotifications(items)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const filtered = notifications.filter(n => {
    if (filter === "all") return true
    return n.type.startsWith(filter)
  })

  const pendingCount = notifications.filter(n => n.status === "pending").length

  const typeIcon = (type: string) => {
    if (type.startsWith("payment")) return <CreditCard className="h-5 w-5" />
    if (type.startsWith("verification")) return <ShieldCheck className="h-5 w-5" />
    if (type.startsWith("booking")) return <CalendarClock className="h-5 w-5" />
    return <Bell className="h-5 w-5" />
  }

  const typeTone = (type: string) => {
    if (type.startsWith("payment")) return "bg-emerald-50 text-emerald-600"
    if (type.startsWith("verification")) return "bg-amber-50 text-amber-600"
    if (type.startsWith("booking")) return "bg-sky-50 text-sky-600"
    return "bg-slate-50 text-slate-600"
  }

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to view notifications.">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
            <p className="mt-1 text-slate-500">Payment alerts, booking updates and reminders.</p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              <Bell className="h-3.5 w-3.5" /> {pendingCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(["all", "payment", "verification", "booking"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f ? "bg-emerald-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No notifications</p>
            <p className="mt-1 text-sm text-slate-500">
              Payment alerts and booking updates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${typeTone(item.type)}`}>
                    {typeIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.message}</p>

                    {item.type === "payment_submitted" && (
                      <Link
                        to="/landlord/payments"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Review Payment
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.status === "pending" && <Bell className="h-4 w-4 text-amber-500" />}
                    {item.status === "sent" && <Check className="h-4 w-4 text-emerald-500" />}
                    {item.status === "failed" && <X className="h-4 w-4 text-rose-500" />}
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
