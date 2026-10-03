import { useEffect, useState } from "react"
import { Check, Copy, Loader2, Mail, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react"
import type { PropertyMember, TeamMemberRole, TeamPermissions } from "../types/domain"
import {
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  resendInviteToken,
  updateTeamMember,
} from "../lib/team"
import { defaultPermissionsForRole } from "../types/domain"

interface Props {
  propertyId: string
}

const PERMISSION_LABELS: { key: keyof TeamPermissions; label: string; hint: string }[] = [
  { key: "view_property", label: "View property & rooms", hint: "Rooms, availability, tenant contacts" },
  { key: "manage_bookings", label: "Manage bookings", hint: "Approve / reject booking requests" },
  { key: "handle_maintenance", label: "Handle maintenance", hint: "View & respond to maintenance requests" },
  { key: "edit_utilities", label: "Edit utilities & rates", hint: "Utility prices, usage, deposit" },
  { key: "record_payments", label: "Record payments", hint: "Log a received cash/M-Pesa payment" },
  { key: "view_finances", label: "View finances", hint: "Paybill/Till, invoices, earnings" },
  { key: "manage_team", label: "Manage team", hint: "Add / remove other agents & caretakers" },
]

const roleBadge: Record<TeamMemberRole, { label: string; className: string }> = {
  agent: { label: "Agent", className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100" },
  caretaker: { label: "Caretaker", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
}

export function TeamPanel({ propertyId }: Props) {
  const [members, setMembers] = useState<PropertyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // add form
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<TeamMemberRole>("agent")
  const [perms, setPerms] = useState<TeamPermissions>(defaultPermissionsForRole("agent"))
  const [pendingInviteUrl, setPendingInviteUrl] = useState<string | null>(null)

  // edit permission state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingPerms, setEditingPerms] = useState<TeamPermissions | null>(null)

  const load = async () => {
    setLoading(true)
    const list = await getTeamMembers(propertyId)
    setMembers(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [propertyId])
const resetForm = () => {
    setFullName("")
    setEmail("")
    setPhone("")
    setRole("agent")
    setPerms(defaultPermissionsForRole("agent"))
    setPendingInviteUrl(null)
    setShowForm(false)
  }

  const togglePerm = (key: keyof TeamPermissions) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleRoleChange = (nextRole: TeamMemberRole) => {
    setRole(nextRole)
    setPerms(defaultPermissionsForRole(nextRole))
  }

  const handleInvite = async () => {
    setError(null)
    setSuccess(null)
    if (!fullName.trim()) { setError("Enter a full name"); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Enter a valid email address"); return }

    setSaving(true)
    const result = await inviteTeamMember(propertyId, {
      full_name: fullName.trim(),
      email: email.trim(),
      phone_number: phone.trim() || undefined,
      role,
      permissions: perms,
    })
    setSaving(false)

    if (!result.success || !result.member) {
      setError(result.error || "Failed to add team member")
      return
    }
    setPendingInviteUrl(result.inviteUrl || "")
    setMembers((prev) => [result.member!, ...prev])
    setSuccess(`Invitation created for ${fullName.trim()}. Share the link so they can set their own password.`)
  }

  const handleRemove = async (member: PropertyMember) => {
    if (!window.confirm(`Remove ${member.full_name || member.email} from this property? Their access will be revoked.`)) return
    setError(null)
    const result = await removeTeamMember(member.id)
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      setSuccess(`${member.full_name || member.email} removed.`)
    } else {
      setError(result.error || "Failed to remove member")
    }
  }

  const handleResend = async (member: PropertyMember) => {
    setError(null)
    const result = await resendInviteToken(member.id)
    if (result.success && result.inviteUrl) {
      setPendingInviteUrl(result.inviteUrl)
      setSuccess(`New invite link generated for ${member.email}.`)
    } else {
      setError(result.error || "Failed to regenerate link")
    }
  }

  const startEdit = (member: PropertyMember) => {
    setEditingId(member.id)
    setEditingPerms({ ...member.permissions })
  }

  const handleSavePermissions = async (member: PropertyMember) => {
    if (!editingPerms) return
    setError(null)
    const result = await updateTeamMember(member.id, { permissions: editingPerms })
    if (result.success) {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, permissions: editingPerms } : m)))
      setEditingId(null)
      setEditingPerms(null)
      setSuccess("Permissions updated.")
    } else {
      setError(result.error || "Failed to save permissions")
    }
  }
return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <Check className="mr-1.5 inline h-4 w-4" /> {success}
        </div>
      )}

      {pendingInviteUrl && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          <div className="flex items-center justify-between gap-3">
            <p className="flex-1 truncate font-mono text-xs">{pendingInviteUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(pendingInviteUrl); setSuccess("Invite link copied!") }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Copy className="h-3 w-3" /> Copy link
            </button>
          </div>
          <p className="mt-1.5 text-xs">
            The person opens this link, creates their own password, and is added to the property. Landlord never sees or holds their password.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold text-slate-900">Agents & caretakers</h2>
            <p className="text-xs text-slate-500">Each person gets their own login. Access is scoped to this property only.</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setPendingInviteUrl(null) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {showForm ? "Close" : "Add member"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No agents or caretakers yet. Add one to give them their own login to this property.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const badge = roleBadge[member.role]
              const isEditing = editingId === member.id
              return (
                <div key={member.id} className="p-4">
<div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        {(member.full_name || member.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.full_name || member.email}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>{badge.label}</span>
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                          {member.phone_number && <span>{member.phone_number}</span>}
                          <span className={member.status === "active" ? "text-emerald-600" : "text-amber-600"}>
                            {member.status === "active" ? "Active" : member.status === "invited" ? "Invited" : "Removed"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {member.status === "invited" && (
                        <button onClick={() => handleResend(member)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50">
                          New link
                        </button>
                      )}
                      <button onClick={() => startEdit(member)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        <Pencil className="h-3 w-3" /> Privileges
                      </button>
                      <button onClick={() => handleRemove(member)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Remove member">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isEditing && editingPerms && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {PERMISSION_LABELS.map(({ key, label, hint }) => (
                          <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                            <input
                              type="checkbox"
                              checked={!!editingPerms[key]}
                              onChange={() => setEditingPerms((prev) => ({ ...prev!, [key]: !prev![key] }))}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>
                              <span className="block text-sm font-medium text-slate-800">{label}</span>
                              <span className="block text-xs text-slate-400">{hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button onClick={() => { setEditingId(null); setEditingPerms(null) }} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                          Cancel
                        </button>
                        <button onClick={() => handleSavePermissions(member)} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
                          Save privileges
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
{showForm && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-700" />
            <h2 className="font-semibold text-slate-900">Add team member</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            They'll get their own login — you choose the role and the exact privileges.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Wanjiru" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email (their login)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane@property.co.ke" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712 345 678" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
              <select value={role} onChange={(e) => handleRoleChange(e.target.value as TeamMemberRole)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                <option value="agent">Agent</option>
                <option value="caretaker">Caretaker</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-slate-600">Privileges</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSION_LABELS.map(({ key, label, hint }) => (
                <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                  <input
                    type="checkbox"
                    checked={!!perms[key]}
                    onChange={() => togglePerm(key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-400">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={resetForm} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create account & invite
            </button>
          </div>
        </section>
      )}
    </div>
  )
}