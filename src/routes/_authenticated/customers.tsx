import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/customers")({
  component: () => (
    <PlaceholderPage
      title="Customers"
      description="Customer profiles, dues, loyalty and purchase history."
      icon={<Users className="h-5 w-5" />}
      features={["Profile, contact, address","Previous purchases","Due balance","Payment history","Loyalty points","Customer notes","Customer groups","Bulk import"]}
    />
  ),
});
