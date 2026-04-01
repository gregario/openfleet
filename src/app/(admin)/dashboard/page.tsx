export default function DashboardPage() {
  return (
    <div className="flex h-full gap-4">
      {/* Map area — ~70% width */}
      <div className="flex-[7] rounded-lg border border-slate-200 bg-white">
        <div
          id="map"
          className="flex h-full min-h-[500px] items-center justify-center text-sm text-slate-400"
        >
          Map loads here
        </div>
      </div>

      {/* Status sidebar — ~30% width */}
      <div className="flex-[3] rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Fleet Status</h2>
        <p className="mt-2 text-sm text-slate-500">
          Vehicle statuses and alerts will appear here.
        </p>
      </div>
    </div>
  );
}
