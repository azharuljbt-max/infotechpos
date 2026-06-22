import { supabase } from "@/integrations/supabase/client";

export type AuditSeverity = "info" | "warning" | "critical";

export interface LogAuditParams {
  module: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  before_data?: unknown;
  after_data?: unknown;
  severity?: AuditSeverity;
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
    await (supabase.from("audit_logs" as any) as any).insert({
      user_id: userData.user.id,
      user_email: userData.user.email,
      module: params.module,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      description: params.description ?? null,
      before_data: params.before_data ?? null,
      after_data: params.after_data ?? null,
      user_agent: ua,
      device: detectDevice(),
      severity: params.severity ?? "info",
    });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
