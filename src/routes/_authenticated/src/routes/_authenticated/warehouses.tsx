import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/warehouses")({
  component: () => (
    <PlaceholderPage
      title="Warehouses"
      description="Manage warehouse locations and branch stock."
      icon={<Building2 className="h-5 w-5" />}
      features={["Multiple warehouses","Branch mapping","Default warehouse per branch","Capacity & zones","Stock by warehouse","Transfer history","Manager assignment","Address & contact"]}
    />
  ),
});
