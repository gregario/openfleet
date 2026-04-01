import { EmptyState } from '@/components/empty-state';

export default function DriverHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Vehicle</h1>
      <EmptyState
        title="No vehicle assigned"
        description="Your assigned vehicle will appear here once set up by your admin."
      />
    </div>
  );
}
