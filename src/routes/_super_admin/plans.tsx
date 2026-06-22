import { createFileRoute } from "@tanstack/react-router";
import { PlansEditor } from "@/lib/saas";

export const Route = createFileRoute("/_super_admin/plans")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">Define the plans you sell to companies.</p>
      </div>
      <PlansEditor />
    </div>
  ),
});
