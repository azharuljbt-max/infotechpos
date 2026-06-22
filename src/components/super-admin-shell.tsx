import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPER_ADMIN_NAV } from "@/lib/super-admin-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SuperAdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/super-admin/login", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/super-admin/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>Super Admin</span>
          </Link>
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {SUPER_ADMIN_NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.to;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-md bg-primary/10 px-2.5 py-2 text-xs">
            <div className="font-medium text-primary">System Control</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Global access · All tenants</div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium text-muted-foreground">Super Admin Portal</div>
          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">SA</div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Super Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}
