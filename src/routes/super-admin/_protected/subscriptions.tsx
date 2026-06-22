import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsEditor } from "@/lib/saas";

export const Route = createFileRoute("/super-admin/_protected/subscriptions")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Subscription Billing</h1>
        <p className="text-sm text-muted-foreground">Assign plans to companies and track billing cycles.</p>
      </div>
      <SubscriptionsEditor />
    </div>
  ),
});
