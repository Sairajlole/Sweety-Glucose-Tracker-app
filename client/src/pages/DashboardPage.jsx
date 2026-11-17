import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Droplets,
  Plus,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import DailyCompletionBanner from '../components/DailyCompletionBanner';
import PageHeader from '../components/PageHeader';
import ReadingFormModal from '../components/ReadingFormModal';
import ReadingsTable from '../components/ReadingsTable';
import ConfirmDialog from '../components/ConfirmDialog';
import StatCard from '../components/StatCard';
import WeekSparkline from '../components/WeekSparkline';
import { getErrorMessage, readingsApi, reportsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatLongDate, relativeDate, todayISO } from '../utils/dates';
import { formatAverage, glucoseBand } from '../utils/glucose';

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [daily, setDaily] = useState(null);
  const [monthToDate, setMonthToDate] = useState(null);
  const [recent, setRecent] = useState([]);
  const [monthReadings, setMonthReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (date) => {
      setLoading(true);
      setLoadError('');
      try {
        const monthStart = `${date.slice(0, 7)}-01`;
        const [dailyReport, mtdReport, recentData, monthData] = await Promise.all([
          reportsApi.daily(date),
          reportsApi.monthToDate(date),
          readingsApi.list({ page: 1, limit: 5 }),
          readingsApi.list({ from: monthStart, to: date, limit: 200 }),
        ]);
        setDaily(dailyReport);
        setMonthToDate(mtdReport);
        setRecent(recentData.readings);
        setMonthReadings(monthData.readings);
      } catch (error) {
        setLoadError(getErrorMessage(error, 'Could not load your dashboard.'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(selectedDate);
  }, [load, selectedDate]);

  const firstName = useMemo(() => (user?.name || '').split(' ')[0] || 'there', [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const summary = daily?.summary ?? { highest: null, lowest: null, average: null, totalReadings: 0 };

  // Last-seven-days daily averages for the month-card sparkline, plus the
  // share of this month's readings inside the 70-180 mg/dL target band.
  const { weekPoints, inRangePct } = useMemo(() => {
    const byDay = new Map();
    for (const reading of monthReadings) {
      const list = byDay.get(reading.readingDate) || [];
      list.push(reading.glucoseValue);
      byDay.set(reading.readingDate, list);
    }

    const [year, month, day] = selectedDate.split('-').map(Number);
    const points = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(year, month - 1, day - offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const values = byDay.get(key);
      if (values?.length) {
        points.push({
          day: key,
          avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
        });
      }
    }

    const inRange =
      monthReadings.length === 0
        ? null
        : Math.round(
            (monthReadings.filter((r) => r.glucoseValue >= 70 && r.glucoseValue <= 180).length /
              monthReadings.length) *
              100
          );

    return { weekPoints: points, inRangePct: inRange };
  }, [monthReadings, selectedDate]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (reading) => {
    setEditing(reading);
    setFormOpen(true);
  };

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
    await load(selectedDate);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await readingsApi.remove(pendingDelete.id);
      toast.success('Reading deleted.');
      setPendingDelete(null);
      await load(selectedDate);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the reading.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={formatLongDate(selectedDate)}
        actions={
          <>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="dashboard-date" className="sr-only">
                Selected date
              </label>
              <input
                id="dashboard-date"
                type="date"
                className="input w-[168px] pl-9"
                value={selectedDate}
                max={todayISO()}
                onChange={(event) => setSelectedDate(event.target.value || todayISO())}
              />
            </div>
            <button type="button" className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add reading
            </button>
          </>
        }
      />

      {loadError ? (
        <div
          className="mb-6 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-700">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => load(selectedDate)}
            className="text-sm font-semibold text-rose-700 underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      <DailyCompletionBanner visible={!loading && summary.totalReadings >= 4} />

      {/* ---------- Daily summary ---------- */}
      <section aria-label="Daily summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Readings this day"
          value={summary.totalReadings}
          unit="of 4"
          icon={Activity}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Highest"
          value={summary.highest}
          icon={TrendingUp}
          tone="rose"
          loading={loading}
          hint={summary.totalReadings ? 'Peak reading for the day' : 'No readings for this day'}
        />
        <StatCard
          label="Lowest"
          value={summary.lowest}
          icon={TrendingDown}
          tone="emerald"
          loading={loading}
          hint={summary.totalReadings ? 'Lowest reading for the day' : 'No readings for this day'}
        />
        <StatCard
          label="Average"
          value={formatAverage(summary.average)}
          icon={Droplets}
          tone="amber"
          loading={loading}
          hint={summary.totalReadings ? 'Rounded to one decimal' : 'No readings for this day'}
        />
      </section>

      {/* ---------- Day detail + month summary ---------- */}
      <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <section className="card flex flex-col lg:col-span-2" aria-label="Daily report">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Daily report</h2>
              <p className="text-xs text-slate-500">{relativeDate(selectedDate)}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {summary.totalReadings} / 4 readings
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : daily && daily.readings.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {daily.readings.map((reading) => {
                const band = glucoseBand(reading.glucoseValue);
                return (
                  <li
                    key={reading.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Droplets className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {reading.timeSlotLabel || reading.timeSlot}
                        </p>
                        <p className="text-xs text-slate-400">{formatLongDate(reading.readingDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${band.text}`}>
                        {reading.glucoseValue}
                        <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                      </span>
                      <span
                        className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${band.chip}`}
                      >
                        {band.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="A fresh day to track"
              description="Add your morning reading to get started — the rest of the day will fill in from here."
              action={
                <button type="button" className="btn-primary" onClick={openAdd}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add a reading
                </button>
              }
            />
          )}
        </section>

        <section className="card flex flex-col p-5" aria-label="Month to date summary">
          <h2 className="text-sm font-semibold text-slate-900">This month so far</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {monthToDate?.period?.label || 'From the 1st of this month'}
          </p>

          {inRangePct !== null ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2">
              <span className="text-lg font-bold tabular-nums text-emerald-700">{inRangePct}%</span>
              <span className="text-xs leading-snug text-emerald-700/80">
                of readings in the 70–180 mg/dL target range
              </span>
            </div>
          ) : null}

          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-slate-400">Last 7 days</p>
            <WeekSparkline points={weekPoints} />
          </div>

          <dl className="mt-4 space-y-3.5">
            {[
              { label: 'Highest', value: monthToDate?.summary?.highest },
              { label: 'Lowest', value: monthToDate?.summary?.lowest },
              { label: 'Average', value: formatAverage(monthToDate?.summary?.average) },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline justify-between">
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {item.value ?? '-'}
                  {item.value != null ? (
                    <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                  ) : null}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
              <dt className="text-sm text-slate-500">Readings</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {monthToDate?.summary?.totalReadings ?? 0}
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-5">
            <Link
              to="/reports"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
            View full reports
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* ---------- Recent readings ---------- */}
      <section className="card mt-6" aria-label="Recent readings">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent readings</h2>
          <Link
            to="/readings"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ReadingsTable
          readings={recent}
          onEdit={openEdit}
          onDelete={setPendingDelete}
          emptyTitle="Nothing here yet"
          emptyDescription="Your first reading is one tap away — it only takes a few seconds."
          emptyAction={
            <button type="button" className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add your first reading
            </button>
          }
        />
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
            : { readingDate: selectedDate, timeSlot: 'MORNING', glucoseValue: '' }
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
