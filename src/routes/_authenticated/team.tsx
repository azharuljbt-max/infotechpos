import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/team")({
  component: () => (
    <PlaceholderPage
      title="Team & Roles"
      description="Manage users, roles and granular permissions."
      icon={<ShieldCheck className="h-5 w-5" />}
      features={["Invite team members","Predefined roles","Custom roles","Granular permissions","Branch assignment","2FA enforcement","User activity","Deactivate / transfer"]}
    />
  ),
});
