import { AdminLayout } from '@/components/admin-layout';

// TODO: Add real auth guard once session middleware is wired up
export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
