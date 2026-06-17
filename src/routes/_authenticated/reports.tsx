import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/reports")({
  component: () => (
    <PlaceholderPage
      title="Reports"
      description="Fully filterable reports across every module."
      icon={<BarChart3 className="h-5 w-5" />}
      features={["Sales, purchase, expense","Profit & loss","Stock & inventory","Customer & supplier","Due & installment","Tax & cash flow","Date range filters","Export to Excel / PDF / CSV"]}
    />
  ),
});
