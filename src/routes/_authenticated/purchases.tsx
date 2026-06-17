import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/purchases")({
  component: () => (
    <PlaceholderPage
      title="Purchases"
      description="Purchase orders, supplier bills, returns, and payments."
      icon={<Truck className="h-5 w-5" />}
      features={["Purchase orders","Supplier invoices","Purchase returns","Pending purchases","Supplier dues","Payment history","Goods receipt","Purchase reports"]}
    />
  ),
});
