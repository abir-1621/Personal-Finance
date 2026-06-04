type DataTableProps = {
  children: React.ReactNode;
};

export function DataTable({ children }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
