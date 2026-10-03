import { createBrowserRouter, redirect } from "react-router-dom"
import LoginScreen from "./routes/login"
import SignupScreen from "./routes/signup"
import TenantLoginScreen from "./routes/tenant-login"
import AppLayout, { appLoader } from "./routes/_app"
import DashboardScreen, { dashboardLoader } from "./routes/_app/dashboard"
import LandlordPropertiesScreen, { propertiesLoader } from "./routes/landlord/properties"
import PropertyDetailScreen, { propertyDetailLoader } from "./routes/landlord/property-detail"
import LandlordTenanciesScreen, { tenanciesLoader } from "./routes/landlord/tenancies"
import LandlordInvoicesScreen, { invoicesLoader } from "./routes/landlord/invoices"
import LandlordPaymentsScreen from "./routes/landlord/payments"
import LandlordNotificationsScreen from "./routes/landlord/notifications"
import MaintenanceScreen from "./routes/landlord/maintenance"
import SettingsScreen from "./routes/landlord/settings"
import LandlordOperationsScreen from "./routes/landlord/operations"
import BookingRequestsScreen, { bookingRequestsLoader } from "./routes/landlord/booking-requests"
import LandlordVerificationScreen, { verificationLoader } from "./routes/landlord/verification"
import AdminLayout, { adminLoader } from "./routes/_admin"
import AdminDashboardScreen, { adminDashboardLoader } from "./routes/admin/dashboard"
import AdminVerificationScreen, { verificationLoader as adminVerificationLoader } from "./routes/admin/verification"
import AdminListingsScreen, { adminListingsLoader } from "./routes/admin/listings"
import AdminUsersScreen, { usersLoader } from "./routes/admin/users"
import AdminNotificationsScreen from "./routes/admin/notifications"
import AdminSettingsScreen, { settingsLoader } from "./routes/admin/settings"
import TenantLayout, { tenantLoader } from "./routes/_tenant"
import TenantDashboardScreen, { tenantDashboardLoader } from "./routes/tenant/dashboard"
import TenantHomeScreen from "./routes/tenant/home"
import TenantRentScreen from "./routes/tenant/rent"
import TenantLeaseScreen from "./routes/tenant/lease"
import TenantLeasesScreen, { tenantLeasesLoader } from "./routes/tenant/leases"
import TenantPaymentsScreen from "./routes/tenant/payments"
import TenantInvoicesScreen from "./routes/tenant/invoices"
import TenantDocumentsScreen from "./routes/tenant/documents"
import TenantMaintenanceScreen from "./routes/tenant/maintenance"
import TenantNotificationsScreen from "./routes/tenant/notifications"
import TenantProfileScreen from "./routes/tenant/profile"
import PropertyJoinScreen, { propertyJoinLoader } from "./routes/join/property"
import RoomJoinScreen, { roomJoinLoader } from "./routes/join/room"
import TeamInviteScreen from "./routes/team-invite"
import NotFound from "./routes/NotFound"

const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/login"),
  },
  {
    path: "/login",
    element: <LoginScreen />,
  },
  {
    path: "/signup",
    element: <SignupScreen />,
  },
  {
    path: "/tenant/login",
    element: <TenantLoginScreen />,
  },
  {
    id: "landlord",
    path: "/landlord",
    element: <AppLayout />,
    loader: appLoader,
    children: [
      {
        index: true,
        loader: () => redirect("/landlord/dashboard"),
      },
      {
        path: "dashboard",
        element: <DashboardScreen />,
        loader: dashboardLoader,
      },
      {
        path: "properties",
        element: <LandlordPropertiesScreen />,
        loader: propertiesLoader,
      },
      {
        path: "properties/:propertyId",
        element: <PropertyDetailScreen />,
        loader: propertyDetailLoader,
      },
      {
        path: "tenancies",
        element: <LandlordTenanciesScreen />,
        loader: tenanciesLoader,
      },
      {
        path: "invoices",
        element: <LandlordInvoicesScreen />,
        loader: invoicesLoader,
      },
      {
        path: "payments",
        element: <LandlordPaymentsScreen />,
        loader: invoicesLoader,
      },
      {
        path: "booking-requests",
        element: <BookingRequestsScreen />,
        loader: bookingRequestsLoader,
      },
      {
        path: "verification",
        element: <LandlordVerificationScreen />,
        loader: verificationLoader,
      },
      {
        path: "notifications",
        element: <LandlordNotificationsScreen />,
      },
      { path: "maintenance", element: <MaintenanceScreen /> },
      {
        path: "settings",
        element: <SettingsScreen />,
        loader: propertiesLoader,
      },
      { path: ":section", element: <LandlordOperationsScreen /> },
    ],
  },
  {
    id: "admin",
    path: "/admin",
    element: <AdminLayout />,
    loader: adminLoader,
    children: [
      {
        index: true,
        loader: () => redirect("/admin/dashboard"),
      },
      {
        path: "dashboard",
        element: <AdminDashboardScreen />,
        loader: adminDashboardLoader,
      },
      {
        path: "verification",
        element: <AdminVerificationScreen />,
        loader: adminVerificationLoader,
      },
      {
        path: "listings",
        element: <AdminListingsScreen />,
        loader: adminListingsLoader,
      },
      {
        path: "users",
        element: <AdminUsersScreen />,
        loader: usersLoader,
      },
      {
        path: "notifications",
        element: <AdminNotificationsScreen />,
      },
      {
        path: "settings",
        element: <AdminSettingsScreen />,
        loader: settingsLoader,
      },
    ],
  },
  {
    id: "tenant",
    path: "/tenant",
    element: <TenantLayout />,
    loader: tenantLoader,
    children: [
      {
        index: true,
        loader: () => redirect("/tenant/dashboard"),
      },
      {
        path: "dashboard",
        element: <TenantDashboardScreen />,
        loader: tenantDashboardLoader,
      },
      {
        path: "home",
        element: <TenantHomeScreen />,
      },
      {
        path: "rent",
        element: <TenantRentScreen />,
      },
      {
        path: "lease",
        element: <TenantLeaseScreen />,
      },
      {
        path: "leases",
        element: <TenantLeasesScreen />,
        loader: tenantLeasesLoader,
      },
      {
        path: "leases/:leaseId",
        element: <TenantLeasesScreen />,
        loader: tenantLeasesLoader,
      },
      {
        path: "payments",
        element: <TenantPaymentsScreen />,
      },
      {
        path: "invoices",
        element: <TenantInvoicesScreen />,
      },
      {
        path: "documents",
        element: <TenantDocumentsScreen />,
      },
      {
        path: "maintenance",
        element: <TenantMaintenanceScreen />,
      },
      {
        path: "notifications",
        element: <TenantNotificationsScreen />,
      },
      {
        path: "profile",
        element: <TenantProfileScreen />,
      },
    ],
  },
  {
    path: "/accept-invite",
    element: <TeamInviteScreen />,
  },
  {
    path: "/join/property/:code",
    element: <PropertyJoinScreen />,
    loader: propertyJoinLoader,
  },
  {
    path: "/join/room/:code",
    element: <RoomJoinScreen />,
    loader: roomJoinLoader,
  },
  {
    path: "*",
    element: <NotFound />,
  },
])

export default router
