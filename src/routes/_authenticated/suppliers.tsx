import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/suppliers")({
  component: () => (
    <PlaceholderPage
      title="Suppliers"
      description="Supplier directory with purchase history and dues."
      icon={<Truck className="h-5 w-5" />}
      features={["Supplier profile","Purchase history","Due balance","Payment history","Contact persons","Payment terms","Supplier evaluation","Bulk import"]}
    />
  ),
});
