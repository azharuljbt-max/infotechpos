import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Super admins are routed to their portal
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (sa && !location.pathname.startsWith("/super-admin")) {
      throw redirect({ to: "/super-admin/dashboard" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
