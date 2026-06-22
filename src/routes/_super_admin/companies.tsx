import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_super_admin/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const qc = useQueryClient();
  const { data: companies = [] } = useQuery({
    queryKey: ["sa-all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, owner_id, currency, is_active, created_at, email, phone")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["sa-all-companies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">All Companies</h1>
        <p className="text-sm text-muted-foreground">Global overview of every tenant. Suspend or activate access.</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.owner_id?.slice(0, 8)}…</TableCell>
                <TableCell>{c.currency}</TableCell>
                <TableCell className="text-xs">{c.email ?? "—"}</TableCell>
                <TableCell>{c.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Suspended</Badge>}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}>
                    {c.is_active ? "Suspend" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No companies yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
