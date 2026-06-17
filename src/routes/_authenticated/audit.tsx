import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/src/routes/_authenticated/audit")({
  component: () => (
    <PlaceholderPage
      title="Audit Log"
      description="Complete audit trail of every change."
      icon={<ClipboardList className="h-5 w-5" />}
      features={["Who, what, when","Filter by user / module","IP & device","Diff viewer","Export logs","Retention policy","Activity log","Security alerts"]}
    />
  ),
});
