import { HeartPulse } from 'lucide-react';

/**
 * Friendly one-line summary of how much of the period sat inside the
 * 70-180 mg/dL target band, with a thin progress bar.
 */
export default function InRangeStrip({ readings = [], loading = false }) {
  if (loading) {
    return <div className="mt-5 h-[68px] animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (readings.length === 0) return null;

  const inRange = readings.filter((r) => r.glucoseValue >= 70 && r.glucoseValue <= 180).length;
  const pct = Math.round((inRange / readings.length) * 100);

  return (
    <div className="card mt-5 flex items-center gap-4 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
        <HeartPulse className="h-5 w-5 text-emerald-600" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-600">
          <span className="font-bold tabular-nums text-slate-900">{pct}%</span> of readings in the
          70–180 mg/dL target range
          <span className="text-slate-400">
            {' '}
            ({inRange} of {readings.length})
          </span>
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% of readings in range`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
