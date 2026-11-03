import { ClipboardList } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import PlansList from "@/components/common/PlansList";

export const metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <>
      <PageHeader title="Plans" subtitle="The plans FitMate keeps you on" icon={ClipboardList} />
      <div className="space-y-6">
        <PlansList />
      </div>
    </>
  );
}
