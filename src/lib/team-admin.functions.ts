import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setPasswordSchema = z.object({
  targetUserId: z.string().uuid(),
  newPassword: z.string().min(8).max(72),
});

export const setTeamUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPasswordSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the target user belongs to caller's workspace (caller is the owner).
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("id, owner_id, user_id")
      .eq("owner_id", userId)
      .eq("user_id", data.targetUserId)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("User is not a member of your workspace");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
