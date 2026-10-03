import { useState } from "react"
import { NavLink, Outlet, useLoaderData, useNavigate } from "react-router-dom"
import { ChevronDown, LogOut } from "lucide-react"
import { tenantNavItems } from "../config/navigation"
import { clearTenantSession, tenantAuthLoader } from "../lib/tenant-auth"

export { tenantAuthLoader as tenantLoader }

export default function TenantLayout() {
  const { userEmail, userName } = useLoaderData() as { userEmail: string; userName: string }
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const username = userEmail.split("@")[0] ?? ""
  const initials = (username[0] ?? "T").toUpperCase()

  const logout = async () => { clearTenantSession(); navigate("/tenant/login") }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex">
        <div>
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-700 text-base font-bold text-white shadow-sm">T</div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Rentify</h1>
              <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400">TENANT PORTAL</p>
            </div>
          </div>
          <nav className="space-y-6 px-3 py-2">
            <div>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">MY ACCOUNT</p>
              <div className="space-y-1">
                {tenantNavItems.map((item: { label: string; icon: React.ComponentType<{ className?: string }>; to: string }) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `${isActive ? "bg-sky-50 font-semibold text-sky-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 text-sm font-bold text-white">T</span>
            <span className="text-sm font-bold">Rentify Tenant</span>
          </div>
          <div className="relative ml-auto">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="Open profile menu"
              className="flex items-center gap-3 rounded-lg p-1.5 text-left hover:bg-slate-50"
            >
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold">{userName}</span>
                <span className="block text-[11px] text-slate-400">{userEmail}</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">{initials}</span>
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
  )
}
