import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_super_admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { data: roles = [] } = useQuery({
    queryKey: ["sa-all-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("user_roles" as any) as any)
        .select("id, user_id, owner_id, role, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: supers = [] } = useQuery({
    queryKey: ["sa-supers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("super_admins").select("user_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">All users across the platform.</p>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-medium">Super Admins ({supers.length})</div>
        <Table>
          <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Added</TableHead></TableRow></TableHeader>
          <TableBody>
            {supers.map((s: any) => (
              <TableRow key={s.user_id}>
                <TableCell className="font-mono text-xs">{s.user_id}</TableCell>
                <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="p-4 text-sm font-medium">Company users ({roles.length})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.user_id?.slice(0,8)}…</TableCell>
                <TableCell className="font-mono text-xs">{r.owner_id?.slice(0,8)}…</TableCell>
                <TableCell><Badge variant="outline">{r.role}</Badge></TableCell>
                <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No company users</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
