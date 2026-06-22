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

const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name required").max(160),
  legal_name: z.string().trim().max(160).optional().default(""),
  industry: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().max(255).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  tax_id: z.string().trim().max(80).optional().default(""),
  website: z.string().trim().max(255).optional().default(""),
  currency: z.string().trim().min(1).max(8).default("USD"),
  plan: z.enum(["trial", "basic", "pro", "enterprise"]).default("trial"),
  status: z.enum(["active", "suspended", "trial"]).default("active"),
  trial_ends_at: z.string().optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  owner_email: z.string().email().max(255),
  owner_password: strongPassword,
  owner_full_name: z.string().trim().max(120).optional().default(""),
});

export const createCompanyAsSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCompanySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is a super admin.
    const { data: sa, error: saErr } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (saErr) throw new Error(saErr.message);
    if (!sa) throw new Error("Forbidden: super admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.owner_email.toLowerCase().trim();

    // Find or create the owner auth user.
    let ownerId: string | null = null;
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

    if (existing) {
      ownerId = existing.id;
      if (data.owner_password) {
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: data.owner_password,
        });
        if (updErr) throw new Error(updErr.message);
      }
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.owner_password,
        email_confirm: true,
        user_metadata: data.owner_full_name ? { full_name: data.owner_full_name } : undefined,
      });
      if (createErr || !created?.user) throw new Error(createErr?.message || "Failed to create owner");
      ownerId = created.user.id;
    }

    if (!ownerId) throw new Error("Owner user could not be resolved");

    const insertPayload: Record<string, unknown> = {
      user_id: ownerId,
      name: data.name,
      legal_name: data.legal_name || null,
      industry: data.industry || null,
      email: data.email || email,
      phone: data.phone || null,
      address: data.address || null,
      tax_id: data.tax_id || null,
      website: data.website || null,
      currency: data.currency || "USD",
      plan: data.plan,
      status: data.status,
      trial_ends_at: data.trial_ends_at || null,
      notes: data.notes || null,
    };

    const { data: company, error: insErr } = await (supabaseAdmin.from("companies") as any)
      .insert(insertPayload)
      .select("id, name")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ok: true, companyId: company.id, ownerId, email };
  });
