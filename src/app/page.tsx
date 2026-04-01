import { redirect } from 'next/navigation';

// TODO: Replace with real auth check once session/auth is wired up
async function getSession(): Promise<{ role: 'ADMIN' | 'DRIVER' } | null> {
  // Placeholder — returns null (unauthenticated) until auth is implemented
  return null;
}

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/dashboard');
  }

  redirect('/driver');
}
