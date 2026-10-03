import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Mail, ShieldCheck, Building2, Loader2, Lock } from "lucide-react"
import { supabase } from "../lib/supabase"
import { getInviteByToken, acceptInvite, PENDING_INVITE_KEY } from "../lib/team"
import type { TeamMemberRole } from "../types/domain"

export default function TeamInviteScreen() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""

  const [invite, setInvite] = useState<{ email: string; full_name?: string; role?: TeamMemberRole; property_name?: string } | null>(null)
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  const handleLookupInvite = async () => {
    setLoading(true)
    setError(null)
    const found = await getInviteByToken(token)
    setLoading(false)
    if (!found) {
      setError("This invitation link is invalid or has already been used. Ask the landlord to send a new one.")
      return
    }
    const prop = (found as any).properties
    setInvite({
      email: found.email,
      full_name: found.full_name || "",
      role: found.role,
      property_name: (found as any).property_name || prop?.name || "the property",
    })
    setFullName(found.full_name || "")
  }

  const handleCreateAccount = async () => {
    setLoading(true)
    setError(null)
    try {
      // Create their own account (email + their own password) — never shared with landlord
      const { data, error: signupError } = await supabase.auth.signUp({
        email: invite!.email,
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (signupError) {
        if (/already registered/i.test(signupError.message)) {
          localStorage.setItem(PENDING_INVITE_KEY, token)
          setNeedsEmailConfirm(true)
          setLoading(false)
          return
        }
        throw signupError
      }
      if (!data.user) throw new Error("Account creation failed. Check Supabase email confirmation settings.")

      await supabase.from("profiles").upsert({ id: data.user.id, email: invite!.email, full_name: fullName.trim() }).then(
        () => undefined,
        () => undefined
      )

      // If email confirmation is OFF, we get a session now -> claim membership immediately.
      if (data.session) {
        const accepted = await acceptInvite(token)
        if (!accepted.success) throw new Error(accepted.error || "Failed to activate membership")
        setDone(true)
        return
      }

      // Email confirmation is ON: store the invite token, ask them to confirm email, then log in.
      localStorage.setItem(PENDING_INVITE_KEY, token)
      setNeedsEmailConfirm(true)
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }
return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {needsEmailConfirm ? (
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Check your email</h1>
            <p className="mt-2 text-sm text-slate-500">
              Supabase needs you to confirm your email first. Open the email sent to <strong>{invite?.email}</strong>, click the confirmation link, then log in below — your membership to {invite?.property_name} will be activated automatically.
            </p>
            <Link to="/login" className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              Go to login
            </Link>
          </div>
        ) : done ? (
          <div className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">You're in!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your account was created. Log in with your email and password to access {invite?.property_name}.
            </p>
            <Link to="/login" className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              Go to login
            </Link>
          </div>
        ) : invite ? (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white"><Building2 className="h-5 w-5" /></div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Join {invite.property_name}</h1>
                <p className="text-xs text-slate-500">Agent / caretaker invitation</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Create your own account for <strong>{invite.email}</strong>. Set a private password — only you will know it.
            </p>

            {error && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Wanjiru"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                <input value={invite.email || ""} disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateAccount}
              disabled={loading || password.length < 6 || !fullName.trim()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Create my account
            </button>
          </div>
        ) : (
          <div className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Check your invitation</h1>
            {error && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
            <button
              onClick={handleLookupInvite}
              disabled={loading || !token}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify & continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}