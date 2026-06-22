import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const strongPassword = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password is too long")
  .refine((p) => p === p.trim(), "Password cannot have leading or trailing spaces")
  .refine((p) => /[A-Z]/.test(p), "Must contain an uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Must contain a lowercase letter")
  .refine((p) => /[0-9]/.test(p), "Must contain a number")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "Must contain a symbol");

const setPasswordSchema = z
  .object({
    targetUserId: z.string().uuid(),
    newPassword: strongPassword,
    confirmPassword: z.string(),
    confirmEmail: z.string().email(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const setTeamUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPasswordSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Caller must not target themselves through this admin path.
    if (data.targetUserId === userId) {
      throw new Error("Use account settings to change your own password");
    }

    // Verify the target user belongs to the caller's workspace.
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("id, owner_id, user_id, email, is_active")
      .eq("owner_id", userId)
      .eq("user_id", data.targetUserId)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("User is not a member of your workspace");
    if (!roleRow.is_active) throw new Error("This team member is inactive");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Re-confirm by matching the target user's auth email against the typed confirmation.
    const { data: target, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
      data.targetUserId,
    );
    if (getErr || !target?.user) throw new Error("Target user not found");

    const targetEmail = (target.user.email ?? "").toLowerCase().trim();
    const typedEmail = data.confirmEmail.toLowerCase().trim();
    if (!targetEmail || targetEmail !== typedEmail) {
      throw new Error("Confirmation email does not match this user");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);

    return { ok: true, email: targetEmail };
  });
