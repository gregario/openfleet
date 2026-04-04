export default function VehiclesListLoading() {
  return (
    <div className="space-y-4" data-testid="vehicles-list-skeleton">
      {/* Search bar skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-10 w-64 animate-pulse rounded-md bg-slate-200" />
        <div className="h-10 w-40 animate-pulse rounded-md bg-slate-200" />
      </div>

      {/* Health summary skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex gap-12">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-14 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-3 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
