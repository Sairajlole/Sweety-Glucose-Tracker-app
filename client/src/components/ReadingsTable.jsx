import { ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/dates';
import { glucoseBand } from '../utils/glucose';
import EmptyState from './EmptyState';

/** Table of readings with edit and delete actions. */
export default function ReadingsTable({
  readings = [],
  onEdit,
  onDelete,
  busyId = null,
  emptyAction = null,
  emptyTitle = 'No readings yet',
  emptyDescription = 'Your glucose readings will appear here once you add one.',
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
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
                  <span className={`text-sm font-semibold ${band.text}`}>
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
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit?.(reading)}
                      disabled={busy}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
                      aria-label={`Edit reading from ${formatDate(reading.readingDate)}`}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(reading)}
                      disabled={busy}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      aria-label={`Delete reading from ${formatDate(reading.readingDate)}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
