import { createFileRoute } from "@tanstack/react-router";
import { PaymentsEditor } from "@/lib/saas";

export const Route = createFileRoute("/_super_admin/payments")({
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Payment Verification</h1>
        <p className="text-sm text-muted-foreground">Record and verify offline payments (bKash, Nagad, Rocket, bank).</p>
      </div>
      <PaymentsEditor />
    </div>
  ),
});
