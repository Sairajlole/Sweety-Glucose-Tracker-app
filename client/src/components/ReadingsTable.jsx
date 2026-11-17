import { ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { formatDate, relativeDate } from '../utils/dates';
import { glucoseBand } from '../utils/glucose';
import EmptyState from './EmptyState';

function ReadingActions({ reading, onEdit, onDelete, busy, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onEdit?.(reading)}
          disabled={busy}
          className="btn-secondary btn-sm flex-1"
          aria-label={`Edit reading from ${formatDate(reading.readingDate)}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(reading)}
          disabled={busy}
          className="btn-secondary btn-sm flex-1 !text-rose-600 hover:!bg-rose-50"
          aria-label={`Delete reading from ${formatDate(reading.readingDate)}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit?.(reading)}
        disabled={busy}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
        aria-label={`Edit reading from ${formatDate(reading.readingDate)}`}
        title="Edit"
      >
        <Pencil className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete?.(reading)}
        disabled={busy}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
        aria-label={`Delete reading from ${formatDate(reading.readingDate)}`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Table of readings with edit and delete actions. */
export default function ReadingsTable({
  readings = [],
  onEdit,
  onDelete,
  busyId = null,
  emptyAction = null,
  emptyTitle = 'No readings here yet',
  emptyDescription = 'Your glucose readings will appear here once you add your first one.',
}) {
  if (readings.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="table-head">Date</th>
              <th scope="col" className="table-head">Time slot</th>
              <th scope="col" className="table-head">Glucose</th>
              <th scope="col" className="table-head">Status</th>
              <th scope="col" className="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => {
              const band = glucoseBand(reading.glucoseValue);
              const busy = busyId === reading.id;

              return (
                <tr key={reading.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="table-cell whitespace-nowrap font-medium text-slate-900">
                    {formatDate(reading.readingDate)}
                  </td>
                  <td className="table-cell whitespace-nowrap text-slate-600">
                    {reading.timeSlotLabel || reading.timeSlot}
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    <span className={`text-sm font-semibold tabular-nums ${band.text}`}>
                      {reading.glucoseValue}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">mg/dL</span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${band.chip}`}
                    >
                      {band.label}
                    </span>
                  </td>
                  <td className="table-cell">
                    <ReadingActions
                      reading={reading}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      busy={busy}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards - no sideways scrolling on small phones */}
      <ul className="divide-y divide-slate-100 sm:hidden">
        {readings.map((reading) => {
          const band = glucoseBand(reading.glucoseValue);
          const busy = busyId === reading.id;

          return (
            <li key={reading.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-500">
                    {relativeDate(reading.readingDate)}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {reading.timeSlotLabel || reading.timeSlot}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                    {formatDate(reading.readingDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold tabular-nums ${band.text}`}>
                    {reading.glucoseValue}
                    <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${band.chip}`}
                  >
                    {band.label}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <ReadingActions
                  reading={reading}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  busy={busy}
                  compact
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
