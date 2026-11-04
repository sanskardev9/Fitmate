import AdminPlan from "@/components/admin/AdminPlan";

export const metadata = { title: "Admin · Plan" };

export default async function Page({ params }) {
  const { id, planId } = await params;
  return <AdminPlan userId={id} planId={planId} />;
}
