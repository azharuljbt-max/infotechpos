import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubscriptions, useSaasCompanies, usePlans, addDays } from "@/lib/saas";

export const Route = createFileRoute("/_super_admin/trials")({
  component: TrialsPage,
});

function TrialsPage() {
  const { data: subs = [] } = useSubscriptions();
  const { data: companies = [] } = useSaasCompanies();
  const { data: plans = [] } = usePlans();
  const today = new Date().toISOString().slice(0, 10);
  const compById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);
  const planById = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);
  const trials = subs.filter(s => s.status === "trial");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Trial Management</h1>
        <p className="text-sm text-muted-foreground">Companies currently on trial subscriptions.</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Trial ends</TableHead>
              <TableHead>Days left</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trials.map(s => {
              const end = s.trial_ends_at ?? addDays(s.started_at.slice(0,10), 14);
              const daysLeft = Math.ceil((new Date(end).getTime() - new Date(today).getTime()) / 86400000);
              return (
                <TableRow key={s.id}>
                  <TableCell>{compById[s.company_id]?.name ?? s.company_id.slice(0,8)}</TableCell>
                  <TableCell>{planById[s.plan_id]?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{end}</TableCell>
                  <TableCell>{daysLeft}</TableCell>
                  <TableCell>
                    {daysLeft < 0 ? <Badge variant="destructive">Expired</Badge>
                      : daysLeft <= 3 ? <Badge variant="secondary">Ending soon</Badge>
                      : <Badge>Active</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
            {trials.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active trials</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
