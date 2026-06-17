import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/accounting")({
  component: () => (
    <PlaceholderPage
      title="Accounting"
      description="Cash book, bank book, P&L and ledger summaries."
      icon={<Calculator className="h-5 w-5" />}
      features={["Cash book","Bank book","Income & expense","Profit & loss","Cash flow","Ledger summary","Journal entries","Bank reconciliation"]}
    />
  ),
});
