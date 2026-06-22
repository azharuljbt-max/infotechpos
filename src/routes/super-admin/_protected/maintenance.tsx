import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/_protected/maintenance")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Database Maintenance</h1>
        <p className="text-sm text-muted-foreground">Operational tools for the platform database.</p>
      </div>
      <Card className="p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Privileged operations</div>
          <div className="text-muted-foreground mt-0.5">
            Database-level tasks (VACUUM, REINDEX, statistics) are managed by the platform.
            Reach out via support for one-off maintenance.
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Database className="h-4 w-4 text-primary" /><div className="text-sm font-medium">Refresh statistics</div></div>
          <p className="text-xs text-muted-foreground mb-3">Force planner stats recompute for slow queries.</p>
          <Button size="sm" variant="outline" onClick={() => toast.info("Queued for review")}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Request</Button>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Trash2 className="h-4 w-4 text-destructive" /><div className="text-sm font-medium">Purge soft-deleted rows</div></div>
          <p className="text-xs text-muted-foreground mb-3">Permanently remove rows older than 90 days.</p>
          <Button size="sm" variant="outline" onClick={() => toast.info("Queued for review")}>Request purge</Button>
        </Card>
      </div>
    </div>
  ),
});
