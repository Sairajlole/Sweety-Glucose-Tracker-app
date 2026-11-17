import { CheckCircle2 } from 'lucide-react';

/**
 * Celebrates a completed logging day. Rendered only when all four
 * daily readings exist - a small moment of encouragement.
 */
export default function DailyCompletionBanner({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 animate-fade-in"
      role="status"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-emerald-800">
        All four readings logged today — nicely done. Your streak of steady tracking keeps growing.
      </p>
    </div>
  );
}
