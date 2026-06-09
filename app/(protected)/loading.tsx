export default function ProtectedLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-slate-200" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-md bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
