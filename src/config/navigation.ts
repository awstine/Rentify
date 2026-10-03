import { LayoutDashboard, Building2, CalendarClock, ClipboardCheck, Receipt, WalletCards, FileText, Settings, ShieldCheck, Bell, Home, CreditCard, FolderOpen, Wrench, Users, BarChart3 } from "lucide-react"

export interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  requiresVerification?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const landlordNavGroups: NavGroup[] = [
  { label: "WORKSPACE", items: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/landlord/dashboard" },
    { label: "Properties", icon: Building2, to: "/landlord/properties", requiresVerification: true },
    { label: "Booking Requests", icon: CalendarClock, to: "/landlord/booking-requests", requiresVerification: true },
    { label: "Leases", icon: FileText, to: "/landlord/leases", requiresVerification: true },
  ] },
  { label: "FINANCE", items: [
    { label: "Invoices", icon: Receipt, to: "/landlord/invoices", requiresVerification: true },
    { label: "Payments", icon: WalletCards, to: "/landlord/payments", requiresVerification: true },
  ] },
  { label: "OPERATIONS", items: [
    { label: "Inspections", icon: ClipboardCheck, to: "/landlord/inspections", requiresVerification: true },
    { label: "Analytics", icon: BarChart3, to: "/landlord/analytics", requiresVerification: true },
  ] },
  { label: "ACCOUNT", items: [
    { label: "Verification", icon: ShieldCheck, to: "/landlord/verification" },
    { label: "Notifications", icon: Bell, to: "/landlord/notifications" },
    { label: "Settings", icon: Settings, to: "/landlord/settings", requiresVerification: true },
  ] },
]

export const tenantNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/tenant/dashboard" },
  { label: "My Room", icon: Home, to: "/tenant/home" },
  { label: "Payments", icon: CreditCard, to: "/tenant/payments" },
  { label: "Invoices", icon: FileText, to: "/tenant/invoices" },
  { label: "Leases", icon: ShieldCheck, to: "/tenant/leases" },
  { label: "Documents", icon: FolderOpen, to: "/tenant/documents" },
  { label: "Maintenance", icon: Wrench, to: "/tenant/maintenance" },
  { label: "Notifications", icon: Bell, to: "/tenant/notifications" },
  { label: "Settings", icon: Settings, to: "/tenant/profile" },
]

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
  { label: "Verification Queue", icon: ShieldCheck, to: "/admin/verification" },
  { label: "Listing Requests", icon: Building2, to: "/admin/listings" },
  { label: "Users", icon: Users, to: "/admin/users" },
  { label: "Notifications", icon: Bell, to: "/admin/notifications" },
  { label: "Settings", icon: Settings, to: "/admin/settings" },
]
