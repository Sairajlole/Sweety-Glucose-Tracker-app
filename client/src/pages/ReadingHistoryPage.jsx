import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Filter, Plus, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import ReadingFormModal from '../components/ReadingFormModal';
import ReadingsTable from '../components/ReadingsTable';
import { getErrorMessage, readingsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatLongDate, todayISO } from '../utils/dates';

const PAGE_SIZE = 10;

export default function ReadingHistoryPage() {
  const toast = useToast();

  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await readingsApi.list({
        page,
        limit: PAGE_SIZE,
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      });
      setReadings(data.readings);
      setPagination(data.pagination);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load your readings.'));
    } finally {
      setLoading(false);
    }
  }, [page, filters.from, filters.to]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = (field) => (event) => {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ from: '', to: '' });
  };

  const hasFilters = Boolean(filters.from || filters.to);

  const handleSaved = async (values) => {
    if (editing) {
      await readingsApi.update(editing.id, values);
      toast.success('Reading updated.');
    } else {
      await readingsApi.create(values);
      toast.success('Reading saved — nice steady tracking.');
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await readingsApi.remove(pendingDelete.id);
      toast.success('Reading deleted.');
      setPendingDelete(null);
      // Step back a page if the last item on it was removed.
      if (readings.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the reading.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reading history"
        subtitle="Every glucose reading you have recorded, newest first."
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add reading
          </button>
        }
      />

      {loadError ? (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <p className="flex-1 text-sm font-medium text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="text-sm font-semibold text-rose-700 underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="card">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="filter-from" className="label mb-1 text-xs text-slate-500">
                From
              </label>
              <input
                id="filter-from"
                type="date"
                className="input w-[158px]"
                value={filters.from}
                max={filters.to || todayISO()}
                onChange={applyFilter('from')}
              />
            </div>
            <div>
              <label htmlFor="filter-to" className="label mb-1 text-xs text-slate-500">
                To
              </label>
              <input
                id="filter-to"
                type="date"
                className="input w-[158px]"
                value={filters.to}
                max={todayISO()}
                onChange={applyFilter('to')}
              />
            </div>
            {hasFilters ? (
              <button type="button" className="btn-ghost" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 pb-2.5 text-xs text-slate-400">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Optional date filter
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            {pagination.total} {pagination.total === 1 ? 'reading' : 'readings'}
            {hasFilters ? ' in this range' : ' in total'}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <ReadingsTable
            readings={readings}
            onEdit={(reading) => {
              setEditing(reading);
              setFormOpen(true);
            }}
            onDelete={setPendingDelete}
            emptyTitle={hasFilters ? 'Nothing in this date range' : 'No readings yet'}
            emptyDescription={
              hasFilters
                ? 'Try widening the dates a little — your readings might be just outside this window.'
                : 'Your readings will live here — add your first one to get started.'
            }
            emptyAction={
              <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add a reading
              </button>
            }
          />
        )}

        {/* Pagination */}
        {!loading && pagination.total > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <ReadingFormModal
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        initialValues={
          editing
            ? {
                readingDate: editing.readingDate,
                timeSlot: editing.timeSlot,
                glucoseValue: editing.glucoseValue,
              }
            : { readingDate: todayISO(), timeSlot: 'MORNING', glucoseValue: '' }
        }
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        busy={deleting}
        message={
          pendingDelete
            ? `The ${pendingDelete.timeSlotLabel || pendingDelete.timeSlot} reading of ${formatLongDate(
                pendingDelete.readingDate
              )} (${pendingDelete.glucoseValue} mg/dL) will be permanently removed.`
            : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
