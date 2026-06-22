import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    throw redirect({ to: sa ? "/super-admin/dashboard" : "/app/dashboard" });
  },
});
