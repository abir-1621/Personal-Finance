export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
