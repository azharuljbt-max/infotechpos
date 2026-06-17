import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { BadgePercent } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sales")({
  component: () => (
    <PlaceholderPage
      title="Sales"
      description="Sales orders, invoices, returns, and analytics."
      icon={<BadgePercent className="h-5 w-5" />}
      features={["Sales orders","Sales invoices","Sales returns","Customer dues","Payment collection","Delivery status","Sales analytics","Salesperson commission"]}
    />
  ),
});
