
# Multi-Tenant SaaS Restructure

Split the current single app into two fully independent portals with role-based routing, navigation, and access control.

## 1. Roles (single source of truth)

A user's "portal" is decided in this order:
1. Row in `super_admins` → Super Admin
2. Row in `user_roles` where `user_id = owner_id` (the workspace owner) → Company Admin
3. Row in `user_roles` where `user_id ≠ owner_id` → Company Staff (role column: admin/manager/staff/viewer/sales/etc.)

A new server function `getCurrentPortal()` returns `{ portal: "super_admin" | "company", role, ownerId }` and is the single check used by both layouts. No new DB tables needed — existing `super_admins`, `user_roles`, and `companies` cover everything.

## 2. Routing layout

```text
/auth                       public login (auto-redirects by portal after sign-in)
/super-admin/login          super admin login (existing)
/super-admin/*              SUPER ADMIN ONLY (new layout)
/app/*                      COMPANY USERS ONLY (new layout = existing ERP)
/                           redirects based on portal
```

- `src/routes/_super_admin/route.tsx` — new pathless layout. `ssr:false`, `beforeLoad` calls `getCurrentPortal()`; if not super admin → redirect to `/app/dashboard` or `/auth`. Renders a dedicated Super Admin sidebar + topbar.
- `src/routes/_authenticated/route.tsx` (existing) — extend `beforeLoad`: if super admin → redirect to `/super-admin/dashboard`. Keeps current AppShell.
- All current ERP pages move from `/_authenticated/<x>` to `/_authenticated/app/<x>` so company URLs become `/app/dashboard`, `/app/sales`, etc. `src/routes/_authenticated/app/route.tsx` renders the ERP `AppShell`.
- Existing `/super-admin` and `/super-admin/login` flat routes are replaced by routes under the new `_super_admin` layout: `dashboard`, `companies`, `plans`, `subscriptions`, `payments`, `trials`, `users`, `audit`, `reports`, `settings`, `maintenance`, `backup`.

## 3. Sidebars

- `src/lib/nav.ts` — keep only ERP groups (Dashboard, Sales, Purchases, Inventory/Products, Stock/Warehouses, Customers, Suppliers, Accounting, Expenses, Reports, Audit, Team, Notifications, Settings, Companies). Remove the SaaS entry entirely.
- `src/lib/super-admin-nav.ts` — new nav for the Super Admin portal: SaaS Dashboard, Companies Overview, Subscription Plans, Subscriptions & Billing, Trial Management, Payment Verification, User Management, System Reports, Audit Logs, Backup & Restore, Database Maintenance, Global Settings.
- Company staff: filter ERP nav by `role` — e.g. Sales role only sees Dashboard / Sales / Customers / Reports. Mapping table lives in `src/lib/role-permissions.ts`.

## 4. Login flow

`/auth` after successful sign-in calls `getCurrentPortal()` and navigates:
- super_admin → `/super-admin/dashboard`
- company_admin / staff → `/app/dashboard`
- no role at all → keep current behavior (treat as workspace owner of their own data → `/app/dashboard`)

`/super-admin/login` keeps its current strict check.

## 5. Tenant isolation

Already enforced at DB level via existing RLS (`owner_id = auth.uid()` or member-of-workspace). No schema changes. Add `ownerId` to context from `getCurrentPortal()` so the ERP can scope queries to the staff member's owner workspace where needed (today most queries already use `auth.uid()` which RLS resolves correctly).

## 6. What gets created / edited / removed

Created:
- `src/lib/portal.functions.ts` — `getCurrentPortal` server fn
- `src/lib/super-admin-nav.ts`
- `src/lib/role-permissions.ts`
- `src/components/super-admin-shell.tsx` — sidebar + topbar for super admin
- `src/routes/_super_admin/route.tsx` + children: `dashboard.tsx`, `companies.tsx`, `plans.tsx`, `subscriptions.tsx`, `payments.tsx`, `trials.tsx`, `users.tsx`, `reports.tsx`, `audit.tsx`, `settings.tsx`, `maintenance.tsx`, `backup.tsx` (most reuse logic already in `src/routes/_authenticated/saas.tsx` and `super-admin.tsx`)
- `src/routes/_authenticated/app/route.tsx` (renders AppShell + Outlet)

Edited:
- `src/lib/nav.ts` — drop SaaS link; ERP-only
- `src/components/app-shell.tsx` — filter nav by role
- `src/routes/_authenticated/route.tsx` — redirect super admins to `/super-admin`
- `src/routes/auth.tsx` — post-login redirect by portal
- `src/routes/index.tsx` — redirect by portal
- All existing `src/routes/_authenticated/<page>.tsx` → moved to `src/routes/_authenticated/app/<page>.tsx`

Removed:
- `src/routes/_authenticated/saas.tsx` (content moves into super-admin routes)
- `src/routes/super-admin.tsx` and `src/routes/super-admin.login.tsx` (replaced by `_super_admin` layout; `/super-admin/login` becomes a child)

## 7. Technical notes

- `getCurrentPortal` uses `requireSupabaseAuth` so the bearer is attached automatically.
- Both layouts use `ssr:false` (existing pattern) because session lives in `localStorage`.
- Route file renames will regenerate `routeTree.gen.ts` automatically — no manual edits.
- New super-admin pages for Trial Management / Payment Verification / User Management / Reports / Audit / Backup / Maintenance / Global Settings ship as functional v1 scaffolds wired to existing tables (`saas_subscriptions`, `saas_payments`, `audit_logs`, `companies`, `user_roles`); Backup & Restore and Database Maintenance are stub pages with action buttons (real implementations need separate work).
- No DB migration required for the restructure itself.

## 8. Order of work

1. Add `portal.functions.ts` + update `start.ts` if needed.
2. Create `_super_admin` layout + super-admin pages (port `saas.tsx` content).
3. Move ERP pages under `_authenticated/app/` and update all internal `<Link to>` references.
4. Update `nav.ts`, `app-shell.tsx`, `auth.tsx`, `index.tsx`, `_authenticated/route.tsx`.
5. Delete old `saas.tsx`, `super-admin.tsx`, `super-admin.login.tsx`.
6. Smoke-test with Playwright as super admin and as a company user.

Approve and I'll execute in this order.
