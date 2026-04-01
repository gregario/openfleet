import { EmptyState } from '@/components/empty-state';

export default function DriverInspectionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Inspection</h1>
      <EmptyState
        title="No pending inspections"
        description="Pre-trip and post-trip inspections will appear here when due."
      />
    </div>
  );
}
