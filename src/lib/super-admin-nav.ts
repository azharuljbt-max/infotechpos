import {
  LayoutDashboard, Building2, Sparkles, BadgeCheck, Wallet, CalendarClock,
  Users, BarChart3, ClipboardList, Database, Archive, Settings,
} from "lucide-react";
import type { NavGroup } from "./nav";

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    label: "SaaS",
    items: [
      { label: "Dashboard", to: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "Companies", to: "/super-admin/companies", icon: Building2 },
      { label: "Plans", to: "/super-admin/plans", icon: Sparkles },
      { label: "Subscriptions", to: "/super-admin/subscriptions", icon: BadgeCheck },
      { label: "Payments", to: "/super-admin/payments", icon: Wallet },
      { label: "Trials", to: "/super-admin/trials", icon: CalendarClock },
    ],
  },
  {
    label: "System",
    items: [
      { label: "User Management", to: "/super-admin/users", icon: Users },
      { label: "Reports", to: "/super-admin/reports", icon: BarChart3 },
      { label: "Audit Logs", to: "/super-admin/audit", icon: ClipboardList },
      { label: "Maintenance", to: "/super-admin/maintenance", icon: Database },
      { label: "Backup & Restore", to: "/super-admin/backup", icon: Archive },
      { label: "Global Settings", to: "/super-admin/settings", icon: Settings },
    ],
  },
];
