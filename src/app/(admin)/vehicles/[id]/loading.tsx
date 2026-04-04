export default function VehicleDetailLoading() {
  return (
    <div className="space-y-4" data-testid="vehicle-detail-skeleton">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 animate-pulse rounded-lg bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-full bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-slate-200 pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        ))}
      </div>

      {/* Tab content skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-20 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 h-4 w-32 rounded bg-slate-200" />
          <div className="h-64 rounded-md bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
