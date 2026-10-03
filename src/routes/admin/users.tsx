import { MoreVertical, Search, Building2, ShieldCheck, ChevronRight } from "lucide-react"
import { useState } from "react"
import { useLoaderData } from "react-router-dom"
import { adminUsersLoader } from "../../lib/loaders/admin"

export { adminUsersLoader as usersLoader }

type LandlordKYC = {
  idFront: string | null
  idBack: string | null
  selfie: string | null
  signedIdFront: string | null
  signedIdBack: string | null
  signedSelfie: string | null
  idNumber: string | null
  submitted: string | null
}

type UserRow = {
  id: string
  initials: string
  name: string
  phone: string
  email: string
  role: string
  status: string
  statusTone: string
  joined: string
  propertyCount: number
  isLandlord: boolean
  isAdmin: boolean
  isVerified: boolean
  kyc: LandlordKYC | null
}

export default function AdminUsersScreen() {
  const { users, error } = useLoaderData() as { users: UserRow[]; error: string | null }
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const filteredUsers = users.filter(u => {
    const query = search.toLowerCase()
    const name = (u.name || "").toLowerCase()
    const email = (u.email || "").toLowerCase()
    const phone = u.phone || ""
    return name.includes(query) || email.includes(query) || phone.includes(query)
  })

  const landlords = users.length

  const openKYC = (user: UserRow) => {
    if (user.isLandlord) setSelectedUser(user)
  }

  const closeKYC = () => setSelectedUser(null)

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-0.5 text-sm text-slate-500">{landlords} landlords</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search landlords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="p-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No landlords match your search</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openKYC(user)}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${user.isAdmin ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {user.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${user.isAdmin ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100" : (user.isVerified ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100")}`}>
                      {user.role}
                      {user.isVerified && <ShieldCheck className="h-3 w-3" />}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{user.propertyCount} {user.propertyCount === 1 ? "property" : "properties"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${user.isVerified ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span>{user.status}</span>
                    </div>
                  </div>

                  {user.isLandlord && user.kyc && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-violet-700">KYC submitted</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* KYC Detail Modal */}
      {selectedUser && selectedUser.kyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeKYC}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">KYC Documents — {selectedUser.name}</h2>
              <button onClick={closeKYC} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <KYCImage label="ID Front" url={selectedUser.kyc.signedIdFront} />
              <KYCImage label="ID Back" url={selectedUser.kyc.signedIdBack} />
              <KYCImage label="Selfie" url={selectedUser.kyc.signedSelfie} />
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700">Details</p>
              <div className="mt-2 space-y-1 text-slate-600">
                <p>ID Number: {selectedUser.kyc.idNumber || "N/A"}</p>
                <p>Submitted: {selectedUser.kyc.submitted ? new Date(selectedUser.kyc.submitted).toLocaleString() : "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KYCImage({ label, url }: { label: string; url?: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>
    </div>
  )
}