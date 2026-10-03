import { useState } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import { Save, Loader2, ShieldCheck, Bell, CreditCard, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { settingsLoader } from "../../lib/loaders/admin"

export { settingsLoader }

type PlatformSettings = {
  platform_fee_percent: number
  min_deposit_months: number
  max_lease_months: number
  otp_expiry_minutes: number
  sms_provider: string
  maintenance_mode: boolean
}

export default function AdminSettingsScreen() {
  const { platform_fee_percent, min_deposit_months, max_lease_months, otp_expiry_minutes, sms_provider, maintenance_mode } = useLoaderData() as PlatformSettings
  const revalidator = useRevalidator()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState<PlatformSettings>({
    platform_fee_percent,
    min_deposit_months,
    max_lease_months,
    otp_expiry_minutes,
    sms_provider,
    maintenance_mode,
  })

  const handleChange = (key: keyof PlatformSettings, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error: upsertError } = await supabase
      .from("platform_settings")
      .upsert({
        id: "default",
        ...form,
        updated_at: new Date().toISOString(),
      })

    setSaving(false)

    if (upsertError) {
      setError(upsertError.message)
    } else {
      setSuccess("Settings saved successfully")
      revalidator.revalidate()
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Configure platform-wide behavior and limits.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Financial</h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Platform Fee (%)</label>
              <div className="mt-1 flex items-center">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.platform_fee_percent}
                  onChange={(e) => handleChange("platform_fee_percent", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="ml-2 text-slate-500">%</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Fee applied to each rent payment</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Minimum Deposit (months)</label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.min_deposit_months}
                onChange={(e) => handleChange("min_deposit_months", parseInt(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum deposit required at lease start</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Maximum Lease Duration (months)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={form.max_lease_months}
                onChange={(e) => handleChange("max_lease_months", parseInt(e.target.value) || 12)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">Maximum lease term allowed</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Security & Verification</h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">OTP Expiry (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={form.otp_expiry_minutes}
                onChange={(e) => handleChange("otp_expiry_minutes", parseInt(e.target.value) || 10)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">Time before OTP codes expire</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">SMS Provider</label>
              <select
                value={form.sms_provider}
                onChange={(e) => handleChange("sms_provider", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="africas_talking">Africa's Talking (Kenya)</option>
                <option value="termii">Termii (Nigeria)</option>
                <option value="beem">Beem (Tanzania)</option>
                <option value="mock">Mock/Development</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">SMS gateway for OTP delivery</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenance_mode}
                onChange={(e) => handleChange("maintenance_mode", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="font-medium text-slate-900">Maintenance Mode</p>
                <p className="text-sm text-slate-500">Disable all platform operations for maintenance</p>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            <p>User roles and verification are managed through the <a href="/admin/users" className="text-violet-700 font-medium hover:underline">Users</a> and <a href="/admin/verification" className="text-violet-700 font-medium hover:underline">Verification Queue</a> pages.</p>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={() => revalidator.revalidate()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Reset
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  )
}