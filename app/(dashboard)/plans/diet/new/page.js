import PageHeader from "@/components/common/PageHeader";
import DietPlanBuilder from "@/components/diet/DietPlanBuilder";

export const metadata = { title: "New diet plan" };

export default function NewDietPlanPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <DietPlanBuilder header={<PageHeader title="Create your diet plan" subtitle="Diet plan" />} />
    </div>
  );
}
