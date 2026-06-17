import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Truck, Receipt, Users, Building2,
  FileText, FileSignature, Wallet, BarChart3, Calculator, Bell, Settings, ShieldCheck,
  ClipboardList, BadgePercent,
} from "lucide-react";

export type NavItem = { label: string; to: string; icon: any };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "POS", to: "/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", to: "/products", icon: Package },
      { label: "Stock", to: "/stock", icon: Boxes },
      { label: "Warehouses", to: "/warehouses", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sales", to: "/sales", icon: BadgePercent },
      { label: "Purchases", to: "/purchases", icon: Truck },
      { label: "Invoices", to: "/invoices", icon: Receipt },
      { label: "Quotations", to: "/quotations", icon: FileSignature },
      { label: "Expenses", to: "/expenses", icon: Wallet },
    ],
  },
  {
    label: "Contacts",
    items: [
      { label: "Customers", to: "/customers", icon: Users },
      { label: "Suppliers", to: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", to: "/reports", icon: BarChart3 },
      { label: "Accounting", to: "/accounting", icon: Calculator },
      { label: "Audit Log", to: "/audit", icon: ClipboardList },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Team & Roles", to: "/team", icon: ShieldCheck },
      { label: "Notifications", to: "/notifications", icon: Bell },
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Companies", to: "/companies", icon: FileText },
    ],
  },
];
