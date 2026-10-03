import { useState, type FormEvent } from "react"
import { useLoaderData, useRevalidator } from "react-router-dom"
import {
  ShieldCheck, User, CreditCard,
  Save, Loader2
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import {
  upsertPropertyPaymentSettings,
  getAllPropertyPaymentSettings
} from "../../lib/payments"
import { VerificationGate } from "../../components/VerificationGate"
import type { Property, PropertyPaymentSettings } from "../../types/domain"

export default function SettingsScreen() {
  const { properties } = useLoaderData() as { properties: Property[] }
  const revalidator = useRevalidator()
  
  // Profile state
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Payment settings state
  const [propertySettings, setPropertySettings] = useState<Record<string, PropertyPaymentSettings>>({})
  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null)
  const [paymentMessages, setPaymentMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({})

  // Load data on mount
  const loadData = async () => {
    // Load profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number, email")
        .eq("id", user.id)
        .single()
      if (profile) {
        setFullName(profile.full_name || "")
        setPhoneNumber(profile.phone_number || "")
        setEmail(profile.email || user.email || "")
      }
    }

    // Load payment settings for all properties
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const settings = await getAllPropertyPaymentSettings(currentUser.id)
      const settingsMap: Record<string, PropertyPaymentSettings> = {}
      settings.forEach(s => { settingsMap[s.property_id] = s })
      setPropertySettings(settingsMap)
    }
  }

  // Run load on mount
  const [loaded, setLoaded] = useState(false)
  if (!loaded) {
    setLoaded(true)
    loadData()
  }

  // Profile form handler
  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      if (error) throw error

      setProfileMessage({ type: "success", text: "Profile updated successfully" })
      revalidator.revalidate()
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile" })
    } finally {
      setSavingProfile(false)
    }
  }

  // Payment settings handler
  const handlePaymentSave = async (propertyId: string, e: FormEvent) => {
    e.preventDefault()
    setSavingPropertyId(propertyId)
    setPaymentMessages(prev => ({ ...prev, [propertyId]: { type: "success", text: "" } }))

    try {
      const form = e.currentTarget as HTMLFormElement
      const paybill_number = form.paybill_number?.value || ""
      const till_number = form.till_number?.value || ""
      const account_reference = form.account_reference?.value || ""

      if (!account_reference.trim()) {
        throw new Error("Account reference is required")
      }

      const result = await upsertPropertyPaymentSettings({
        property_id: propertyId,
        paybill_number: paybill_number || undefined,
        till_number: till_number || undefined,
        account_reference: account_reference.trim()
      })

      if (!result.success) throw new Error(result.error)

      setPropertySettings(prev => ({ ...prev, [propertyId]: result.data! }))
      setPaymentMessages(prev => ({ ...prev, [propertyId]: { type: "success", text: "Payment settings saved" } }))
      revalidator.revalidate()
    } catch (err: any) {
      setPaymentMessages(prev => ({ ...prev, [propertyId]: { type: "error", text: err.message || "Failed to save" } }))
    } finally {
      setSavingPropertyId(null)
    }
  }

  const propertiesWithSettings = properties.map(p => ({
    ...p,
    paymentSettings: propertySettings[p.id]
  }))

  return (
    <VerificationGate fallbackMessage="Complete KYC verification to access account settings.">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Profile Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
              <p className="text-sm text-slate-500">Your account information</p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`mt-4 rounded-lg p-3 text-sm ${profileMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none bg-slate-50"
              />
              <p className="mt-1 text-xs text-slate-400">Email cannot be changed here. Contact support if needed.</p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Payment Settings Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                <CreditCard className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment Settings</h2>
                <p className="text-sm text-slate-500">Configure M-PESA Paybill/Till for each property</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Each property can have its own Paybill or Till number. Tenants will see these details when making payments.
            The <strong>Account Reference</strong> is what tenants include in the payment (e.g., room number, property name).
          </p>

          {propertiesWithSettings.length === 0 ? (
            <div className="mt-6 text-center py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <p className="mt-3 text-slate-500">No properties yet. Add a property to configure payment settings.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {propertiesWithSettings.map(property => {
                const settings = property.paymentSettings
                const msg = paymentMessages[property.id]

                return (
                  <div key={property.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{property.name}</p>
                          <p className="text-sm text-slate-500">{property.location}</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={e => handlePaymentSave(property.id, e)} className="mt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Paybill Number</label>
                          <input
                            type="text"
                            name="paybill_number"
                            defaultValue={settings?.paybill_number || ""}
                            placeholder="e.g., 123456"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Till Number (Alternative)</label>
                          <input
                            type="text"
                            name="till_number"
                            defaultValue={settings?.till_number || ""}
                            placeholder="e.g., 789012"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Account Reference <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            name="account_reference"
                            required
                            defaultValue={settings?.account_reference || "Room"}
                            placeholder="e.g., Room A101"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                      </div>

                      {msg && (
                        <div className={`rounded-lg p-3 text-sm ${msg.type === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                          {msg.text}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={savingPropertyId === property.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                        >
                          {savingPropertyId === property.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Save className="h-4 w-4" />}
                          {savingPropertyId === property.id ? "Saving..." : "Save Payment Settings"}
                        </button>
                      </div>
                    </form>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </VerificationGate>
  )
}
