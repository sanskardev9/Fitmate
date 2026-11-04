import AdminUser from "@/components/admin/AdminUser";

export const metadata = { title: "Admin · User" };

export default async function Page({ params }) {
  const { id } = await params;
  return <AdminUser id={id} />;
}
