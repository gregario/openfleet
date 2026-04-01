import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminLayout } from '@/components/admin-layout';

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.userId) {
    redirect('/login');
  }

  if (session.role !== 'ADMIN') {
    redirect('/driver');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
