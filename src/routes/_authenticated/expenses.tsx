import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: () => (
    <PlaceholderPage
      title="Expenses"
      description="Track daily, monthly and branch expenses."
      icon={<Wallet className="h-5 w-5" />}
      features={["Expense categories","Daily & monthly view","Branch expense","Receipt attachment","Approval workflow","Recurring expenses","Expense reports","Budget tracking"]}
    />
  ),
});
