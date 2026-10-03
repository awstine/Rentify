import { useParams } from 'react-router-dom'
import { BarChart3, Bell, CalendarCheck, CheckCircle2, ClipboardCheck, DoorOpen, FileText, Plus, Users, WalletCards } from 'lucide-react'
import { VerificationGate } from '../../components/VerificationGate'

const screens = {
  rooms: { eyebrow: 'Portfolio', title: 'Rooms', description: 'Monitor availability, rent and current occupancy across your properties.', icon: DoorOpen, action: 'Add room', columns: ['Room', 'Property', 'Monthly rent', 'Tenant', 'Lease end', 'Status'], empty: 'No rooms found. Add rooms to a property to begin tracking occupancy.' },
  bookings: { eyebrow: 'Tenant lifecycle', title: 'Bookings', description: 'Review tenant applications and pending move-in requests.', icon: CalendarCheck, action: 'Review applications', columns: ['Applicant', 'Requested unit', 'Move-in date', 'Documents', 'Status'], empty: 'There are no pending bookings or applications.' },
  tenants: { eyebrow: 'Tenant lifecycle', title: 'Tenants', description: 'Manage tenant profiles, contacts, balances and tenancy history.', icon: Users, action: 'Add tenant', columns: ['Tenant', 'Property & unit', 'Phone number', 'Balance', 'Status'], empty: 'No tenants are linked to your properties yet.' },
  leases: { eyebrow: 'Tenant lifecycle', title: 'Leases', description: 'Create, renew and monitor legally important tenancy agreements.', icon: FileText, action: 'Create lease', columns: ['Tenant', 'Unit', 'Start date', 'End date', 'Monthly rent', 'Status'], empty: 'No leases have been created yet.' },
  payments: { eyebrow: 'Finance', title: 'Payments', description: 'Reconcile M-Pesa collections, receipts, credits and payment activity.', icon: WalletCards, action: 'Record payment', columns: ['Reference', 'Tenant', 'Invoice', 'Method', 'Amount', 'Status'], empty: 'No payments have been recorded yet.' },
  inspections: { eyebrow: 'Operations', title: 'Inspections', description: 'Schedule and complete digital move-in, routine and move-out inspections.', icon: ClipboardCheck, action: 'Schedule inspection', columns: ['Property & unit', 'Inspection type', 'Scheduled for', 'Assignee', 'Status'], empty: 'No inspections are scheduled.' },
  analytics: { eyebrow: 'Reporting', title: 'Analytics', description: 'Turn your portfolio activity into clear operational decisions.', icon: BarChart3, action: 'Export report', columns: ['Report', 'Period', 'Properties', 'Generated', 'Status'], empty: 'Analytics will appear as your portfolio activity grows.' },
  notifications: { eyebrow: 'Workspace', title: 'Notifications', description: 'Stay ahead of payment, lease, maintenance and approval events.', icon: Bell, action: 'Mark all read', columns: ['Notification', 'Property', 'Date', 'Status'], empty: 'You are all caught up. New operational activity will appear here.' },
} as const

export default function LandlordOperationsScreen() {
  const { section = '' } = useParams()
  const screen = screens[section as keyof typeof screens]
  if (!screen) return <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-xl font-semibold text-slate-900">Page not found</h1><p className="mt-2 text-slate-500">This workspace area is not available.</p></div>
  const Icon = screen.icon
  return (
    <VerificationGate fallbackMessage="Complete KYC verification to access this feature.">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{screen.eyebrow}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{screen.title}</h1><p className="mt-1 max-w-2xl text-slate-500">{screen.description}</p></div>
          <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Plus className="h-4 w-4" /> {screen.action}</button>
        </div>
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-6 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">{screen.columns.map((column) => <span key={column}>{column}</span>)}</div>
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">{screen.empty}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">This operational queue will stay synchronized with the actions taken across your Rentify workspace.</p>
            <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {screen.action}</button>
          </div>
        </section>
      </div>
    </VerificationGate>
  )
}
