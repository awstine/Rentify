import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function SignupScreen() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("254712345678")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: phoneNumber.trim(),
          },
        },
      })

      if (signupError) {
        throw signupError
      }

      const user = data.user
      if (!user) {
        throw new Error("Signup failed. Please check your email settings in Supabase.")
      }

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "landlord",
      })

      if (roleError) {
        console.warn("Role insertion note:", roleError.message)
      }

      navigate("/landlord/verification", { replace: true })
    } catch (error: unknown) {
      console.error("Signup error detail:", error)
      const message = error instanceof Error ? error.message : "Failed to create account"
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-600">
            R
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500">Sign up as a landlord to manage your properties</p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
            <input
              required
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Phone Number</label>
            <input
              required
              type="tel"
              placeholder="254712345678"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

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
              placeholder="Password123!"
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-emerald-700 hover:underline font-semibold">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
