import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { getRedirectPathForUser } from "../lib/role"

export default function LoginScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const { data: { user } } = await (await import("../lib/supabase")).supabase.auth.getUser()
      if (user) {
        const path = await getRedirectPathForUser(user.id)
        navigate(path, { replace: true })
      }
    }
    void redirectIfLoggedIn()
  }, [navigate])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const { data, error } = await (await import("../lib/supabase")).supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      if (data.user && data.session) {
// Complete a deferred team-membership claim (email-confirmation flow)
        try {
          const { completePendingInvite } = await import("../lib/team")
          await completePendingInvite()
        } catch {
          // ignore — membership completion is best-effort on login
        }
        const path = await getRedirectPathForUser(data.user.id)
        navigate(path, { replace: true })
      }
    } catch (error: unknown) {
      console.error("Login error full detail:", error)
      const rawMessage = error instanceof Error ? error.message : ""
      const message = /database error querying schema/i.test(rawMessage)
        ? "Sign-in is temporarily unavailable because the authentication service is not configured correctly. Please contact support."
        : rawMessage || "Invalid email or password. Please try again."
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  const fillSeedCredentials = () => {
    setEmail("landlord@rentify.co.ke")
    setPassword("Password123!")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-600">
            R
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rentify Landlord Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to manage your properties and tenants</p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Email Address</label>
            <input
              required
              type="email"
              placeholder="landlord@rentify.co.ke"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <button onClick={() => navigate("/signup")} className="text-emerald-700 hover:underline font-semibold">
            Create account
          </button>
        </p>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <button
            type="button"
            onClick={fillSeedCredentials}
            className="mt-1 text-emerald-700 hover:underline"
          >
            Fill landlord@rentify.co.ke / Password123!
          </button>
        </div>
      </div>
    </div>
  )
}
