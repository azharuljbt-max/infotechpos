import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/super-admin/_protected/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { data: logs = [] } = useQuery({
    queryKey: ["sa-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, entity, entity_id, created_at, ip_address")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Recent activity across the platform (200 most recent).</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{l.user_id?.slice(0,8) ?? "—"}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell className="text-xs">{l.entity} · {l.entity_id?.slice(0,8)}</TableCell>
                <TableCell className="font-mono text-xs">{l.ip_address ?? "—"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
