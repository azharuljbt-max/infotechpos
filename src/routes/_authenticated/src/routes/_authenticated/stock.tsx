import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/stock")({
  component: () => (
    <PlaceholderPage
      title="Stock"
      description="Real-time inventory across warehouses and branches."
      icon={<Boxes className="h-5 w-5" />}
      features={["Stock in / out / transfer","Multiple warehouses","Damaged stock & adjustments","Stock ledger & history","Inventory valuation","Low stock alerts","Branch-level stock","Audit trail per movement"]}
    />
  ),
});
