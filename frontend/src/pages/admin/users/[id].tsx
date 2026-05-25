import { getDynamicPageProps } from "@/lib/next-dynamic-slugs";
import { AdminUserDetail } from "@/modules/admin/users/AdminUserDetail";

export const getServerSideProps = getDynamicPageProps;

export default function AdminUserDetailPage() {
  return <AdminUserDetail />;
}
