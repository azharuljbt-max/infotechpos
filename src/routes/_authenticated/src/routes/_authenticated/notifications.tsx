import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/notifications")({
  component: () => (
    <PlaceholderPage
      title="Notifications"
      description="Low stock, dues, payments and order notifications."
      icon={<Bell className="h-5 w-5" />}
      features={["Low stock alerts","Due reminders","Installment reminders","Payment received","Order status","Email channel","SMS-ready","Push-ready"]}
    />
  ),
});
