import { useState, useEffect } from "react"
import { Bell, Check, X, Loader2, Search, Send } from "lucide-react"
import { supabase } from "../../lib/supabase"

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  status: "pending" | "sent" | "failed"
  recipient_id?: string
  created_at: string
  sent_at?: string
}

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<NotificationItem | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setNotifications((data || []) as NotificationItem[])
    }
    setLoading(false)
  }

  const handleSend = async (id: string) => {
    if (!window.confirm("Send this notification now?")) return
    setProcessing(id)
    setError(null)
    const { error: updateError } = await supabase
      .from("notification_queue")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
    setProcessing(null)
    if (updateError) {
      setError(updateError.message)
    } else {
      await loadNotifications()
    }
  }

  const handleRetry = async (id: string) => {
    if (!window.confirm("Retry sending this failed notification?")) return
    setProcessing(id)
    setError(null)
    const { error: updateError } = await supabase
      .from("notification_queue")
      .update({ status: "pending", sent_at: null })
      .eq("id", id)
    setProcessing(null)
    if (updateError) {
      setError(updateError.message)
    } else {
      await loadNotifications()
    }
  }

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.message.toLowerCase().includes(search.toLowerCase()) ||
    n.type.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = notifications.filter(n => n.status === "pending").length
  const failedCount = notifications.filter(n => n.status === "failed").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Notification Queue</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage and send platform notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
            <Bell className="h-3.5 w-3.5" /> {pendingCount} pending
          </span>
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
              <X className="h-3.5 w-3.5" /> {failedCount} failed
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search notifications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-sm">
          <Bell className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">No notifications</p>
          <p className="mt-1 text-sm text-slate-500">System notifications will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                    {item.type}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                    item.status === "sent" ? "bg-emerald-50 text-emerald-700" :
                    item.status === "failed" ? "bg-rose-50 text-rose-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                {item.status === "pending" && (
                  <Loader2 className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 line-clamp-1">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{item.message}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                {item.status === "pending" && (
                  <span className="text-violet-700 font-medium">View →</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700">Details</p>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>Type: <span className="font-medium">{selected.type}</span></p>
                <p>Status: <span className={`font-medium ${
                  selected.status === "sent" ? "text-emerald-600" :
                  selected.status === "failed" ? "text-rose-600" :
                  "text-amber-600"
                }`}>{selected.status}</span></p>
                <p>Created: {new Date(selected.created_at).toLocaleString()}</p>
                {selected.recipient_id && <p>Recipient: {selected.recipient_id}</p>}
                {selected.sent_at && <p>Sent: {new Date(selected.sent_at).toLocaleString()}</p>}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-slate-700 mb-2">Message</p>
              <p className="text-slate-600 whitespace-pre-wrap">{selected.message}</p>
            </div>

            <div className="mt-4 flex gap-3">
              {selected.status === "pending" && (
                <button
                  type="button"
                  disabled={processing === selected.id}
                  onClick={() => handleSend(selected.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Now
                </button>
              )}
              {selected.status === "failed" && (
                <button
                  type="button"
                  disabled={processing === selected.id}
                  onClick={() => handleRetry(selected.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {processing === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
