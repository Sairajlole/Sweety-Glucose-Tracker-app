const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};

/**
 * One headline metric (count / highest / lowest / average).
 * Renders a dash instead of a number when the period has no readings, so an
 * empty report never looks like a real measurement of zero.
 */
export default function StatCard({
  label,
  value,
  unit = 'mg/dL',
  icon: Icon,
  tone = 'brand',
  hint,
  loading = false,
}) {
  // A dash means "no measurement in this period" - it should not be dressed
  // up with a unit, otherwise an empty report looks like real data.
  const hasValue =
    value !== null && value !== undefined && value !== '' && value !== '-';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {loading ? <span className="text-slate-300">---</span> : hasValue ? value : '-'}
            </span>
            {hasValue && unit && !loading ? (
              <span className="text-xs font-medium text-slate-400">{unit}</span>
            ) : null}
          </p>
        </div>
        {Icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone] || TONES.brand}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
