/**
 * Glucose banding used for colour cues across the UI.
 *
 * Bands are the widely used general adult targets: below 70 is low,
 * 70-140 is the common post-meal target, and above 180 is high. These are
 * visual aids only - they are not medical advice.
 */
export function glucoseBand(value) {
  if (value == null) return { key: 'none', label: '-', text: 'text-slate-400', chip: 'bg-slate-100 text-slate-600' };
  if (value < 70) return { key: 'low', label: 'Low', text: 'text-amber-600', chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  if (value > 180) return { key: 'high', label: 'High', text: 'text-rose-600', chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' };
  if (value > 140) return { key: 'elevated', label: 'Elevated', text: 'text-orange-600', chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' };
  return { key: 'in-range', label: 'In range', text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' };
}

/** Format a report average (already rounded server-side) for display. */
export const formatAverage = (value) => (value == null ? '-' : Number(value).toFixed(1));
