import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { DriverLayout } from '@/components/driver-layout';

export default async function DriverRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.userId) {
    redirect('/login');
  }

  if (session.role !== 'DRIVER') {
    redirect('/dashboard');
  }

  return <DriverLayout>{children}</DriverLayout>;
}
