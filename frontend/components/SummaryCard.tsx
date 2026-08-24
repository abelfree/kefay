export function SummaryCard({
  label,
  value,
  accent = 'slate',
}: {
  label: string;
  value: string;
  accent?: 'slate' | 'emerald' | 'amber';
}) {
  const accentClasses = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  }[accent];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accentClasses}`}>{value}</p>
    </div>
  );
}
