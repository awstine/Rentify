import { useState } from "react"
import { NavLink, Outlet, useLoaderData, useNavigate } from "react-router-dom"
import { ChevronDown, LogOut, Search, Lock } from "lucide-react"
import { supabase } from "../lib/supabase"
import { appLoader } from "../lib/loaders/auth"
import { landlordNavGroups } from "../config/navigation"
import { VerificationContext } from "../lib/verification-context"
import type { TeamPermissions } from "../types/domain"

const STAFF_BASE_PATHS = ["/landlord/dashboard", "/landlord/notifications"]

const PERMISSION_PATHS: Partial<Record<keyof TeamPermissions, string[]>> = {
  view_property: ["/landlord/properties"],
  manage_bookings: ["/landlord/booking-requests"],
  handle_maintenance: ["/landlord/maintenance"],
  record_payments: ["/landlord/payments"],
  view_finances: ["/landlord/payments", "/landlord/invoices"],
  manage_team: ["/landlord/properties"],
}

function allowedPathsFromPermissions(memberships: { permissions: TeamPermissions }[]): Set<string> {
  const paths = new Set<string>(STAFF_BASE_PATHS)
  for (const m of memberships) {
    for (const key of Object.keys(PERMISSION_PATHS) as (keyof TeamPermissions)[]) {
      if (m.permissions?.[key]) {
        for (const p of PERMISSION_PATHS[key] || []) paths.add(p)
      }
    }
  }
  return paths
}

function filterNavForRole(
  groups: typeof landlordNavGroups,
  role: string,
  memberships: { permissions: TeamPermissions }[]
): typeof landlordNavGroups {
  if (role === "landlord" || role === "admin") return groups
  const allowed = allowedPathsFromPermissions(memberships)
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.has(item.to)) }))
    .filter((group) => group.items.length > 0)
}

export { appLoader }

export default function AppLayout() {
  const { role, userEmail, memberships, isVerified, verificationStatus } = useLoaderData() as { 
    role: string
    memberships: { permissions: TeamPermissions }[]
    userEmail: string
    isVerified: boolean
    verificationStatus: "pending" | "approved" | "rejected" | "more_info" | null
  }
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const username = userEmail.split("@")[0] ?? ""
  const initials = (username[0] ?? "?").toUpperCase()
  const logout = async () => { await supabase.auth.signOut(); navigate("/login") }

  return (
    <VerificationContext.Provider value={{ isVerified, verificationStatus }}>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex">
          <div>
            <div className="flex items-center gap-3 px-5 py-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-base font-bold text-white shadow-sm">R</div>
              <div><h1 className="text-base font-bold tracking-tight">Rentify</h1><p className="text-[10px] font-bold tracking-[0.15em] text-slate-400">PROPERTY OS</p></div>
            </div>
            <nav className="space-y-6 px-3 py-2">
              {filterNavForRole(landlordNavGroups, role, memberships || []).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isGated = item.requiresVerification && !isVerified
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) => {
                            const base = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
                            if (isGated) {
                              return `${base} text-slate-400 hover:bg-slate-50 hover:text-slate-600 cursor-default ${isActive ? "bg-emerald-50 font-semibold text-emerald-800" : ""}`
                            }
                            return `${base} ${isActive ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
                          }}
                          aria-disabled={isGated}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {isGated && <Lock className="h-3.5 w-3.5 text-slate-300 ml-auto" aria-label="Requires KYC verification" />}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">R</span>
              <span className="text-sm font-bold">Rentify</span>
            </div>
            <div className="relative hidden w-80 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search properties, tenants, invoices..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="relative ml-auto">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="Open profile menu"
                className="flex items-center gap-3 rounded-lg p-1.5 text-left hover:bg-slate-50"
              >
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-semibold">{username}</span>
                  <span className="block text-[11px] text-slate-400">{userEmail}</span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{initials}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {profileMenuOpen && (
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to sign out?")) logout()
                  }}
                  className="absolute right-0 top-12 flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 shadow-lg hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              )}
            </div>
          </header>
          <main className="p-5 pb-24 md:p-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </VerificationContext.Provider>
  )
}
