import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Download, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/_protected/backup")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground">Automated daily backups are managed by the platform.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Download className="h-4 w-4 text-primary" /><div className="text-sm font-medium">Export snapshot</div></div>
          <p className="text-xs text-muted-foreground mb-3">Generate a JSON export of all tenant data.</p>
          <Button size="sm" onClick={() => toast.info("Export queued — you'll get an email when ready")}><Archive className="h-3.5 w-3.5 mr-1.5" />Export now</Button>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Upload className="h-4 w-4 text-primary" /><div className="text-sm font-medium">Restore</div></div>
          <p className="text-xs text-muted-foreground mb-3">Restore from a previously generated snapshot.</p>
          <Button size="sm" variant="outline" onClick={() => toast.info("Contact support for restore operations")}>Request restore</Button>
        </Card>
      </div>
      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Backup schedule</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Frequency</div><div className="font-medium">Daily</div></div>
          <div><div className="text-xs text-muted-foreground">Retention</div><div className="font-medium">30 days</div></div>
          <div><div className="text-xs text-muted-foreground">Last backup</div><div className="font-medium">Automatic</div></div>
        </div>
      </Card>
    </div>
  ),
});
