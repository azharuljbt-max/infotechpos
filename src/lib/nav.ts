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
      { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
      { label: "POS", to: "/app/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Products", to: "/app/products", icon: Package },
      { label: "Stock", to: "/app/stock", icon: Boxes },
      { label: "Warehouses", to: "/app/warehouses", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sales", to: "/app/sales", icon: BadgePercent },
      { label: "Purchases", to: "/app/purchases", icon: Truck },
      { label: "Invoices", to: "/app/invoices", icon: Receipt },
      { label: "Quotations", to: "/app/quotations", icon: FileSignature },
      { label: "Expenses", to: "/app/expenses", icon: Wallet },
    ],
  },
  {
    label: "Contacts",
    items: [
      { label: "Customers", to: "/app/customers", icon: Users },
      { label: "Suppliers", to: "/app/suppliers", icon: Truck },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", to: "/app/reports", icon: BarChart3 },
      { label: "Accounting", to: "/app/accounting", icon: Calculator },
      { label: "Audit Log", to: "/app/audit", icon: ClipboardList },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Team & Roles", to: "/app/team", icon: ShieldCheck },
      { label: "Notifications", to: "/app/notifications", icon: Bell },
      { label: "Settings", to: "/app/settings", icon: Settings },
    ],
  },
];
