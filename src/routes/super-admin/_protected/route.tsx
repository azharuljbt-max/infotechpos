import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminShell } from "@/components/super-admin-shell";

export const Route = createFileRoute("/super-admin/_protected")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/super-admin/login" });
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!sa) throw redirect({ to: "/super-admin/login" });
    return { user: data.user };
  },
  component: SuperAdminShell,
});
