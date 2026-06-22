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

    if (data.targetUserId === userId) {
      throw new Error("Use account settings to change your own password");
    }

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

const createCompanyUserSchema = z
  .object({
    email: z.string().email().max(255),
    password: strongPassword,
    confirmPassword: z.string(),
    fullName: z.string().trim().max(120).optional().default(""),
    role: z.enum(["admin", "manager", "staff", "viewer"]).default("admin"),
    branch: z.string().trim().max(120).optional().default(""),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCompanyUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const email = data.email.toLowerCase().trim();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try to find an existing auth user with this email.
    let targetUserId: string | null = null;
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );

    if (existing) {
      targetUserId = existing.id;
      // Reset password on the existing user so the company owner can hand it over.
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: data.fullName ? { full_name: data.fullName } : undefined,
      });
      if (createErr || !created?.user) throw new Error(createErr?.message || "Failed to create user");
      targetUserId = created.user.id;
    }

    if (!targetUserId) throw new Error("No target user");

    // Upsert workspace membership.
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("owner_id", userId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingRole) {
      const { error: upErr } = await supabase
        .from("user_roles")
        .update({
          email,
          full_name: data.fullName || null,
          role: data.role,
          branch: data.branch || null,
          is_active: true,
        })
        .eq("id", existingRole.id);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: insErr } = await supabase.from("user_roles").insert({
        owner_id: userId,
        user_id: targetUserId,
        email,
        full_name: data.fullName || null,
        role: data.role,
        branch: data.branch || null,
        is_active: true,
      });
      if (insErr) throw new Error(insErr.message);
    }

    return { ok: true, userId: targetUserId, email, existed: !!existing };
  });
