import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/common/Card";
import PlanImport from "@/components/common/PlanImport";
import BackLink from "@/components/common/BackLink";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink fallback="/plans" />
      <PageHeader title="Add a plan" subtitle="Import it, create it with AI, or type it in." />
      <Card>
        <PlanImport />
      </Card>
    </div>
  );
}
