import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Droplets,
  History,
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import GlucoseTrendChart from '../components/GlucoseTrendChart';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { getErrorMessage, readingsApi, reportsApi } from '../api/client';
import { formatDate, formatLongDate, formatMonth, todayISO } from '../utils/dates';
import { formatAverage } from '../utils/glucose';

const TABS = [
  { key: 'daily', label: 'Daily', icon: CalendarDays },
  { key: 'mtd', label: 'Month to date', icon: CalendarRange },
  { key: 'previous', label: 'Previous month', icon: History },
];

export default function ReportsPage() {
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState('daily');

  const [reports, setReports] = useState({ daily: null, mtd: null, previous: null });
  const [chartReadings, setChartReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const active = reports[tab];

  const loadReports = useCallback(async (selectedDate) => {
    setLoading(true);
    setLoadError('');
    try {
      const [daily, mtd, previous] = await Promise.all([
        reportsApi.daily(selectedDate),
        reportsApi.monthToDate(selectedDate),
        reportsApi.previousMonth(selectedDate),
      ]);
      setReports({ daily, mtd, previous });
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load the reports.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(date);
  }, [loadReports, date]);

  // Fetch the rows that make up the trend chart for the active period.
  useEffect(() => {
    let cancelled = false;

    if (!active) {
      setChartReadings([]);
      return undefined;
    }

    if (tab === 'daily') {
      setChartReadings(active.readings || []);
      return undefined;
    }

    setChartLoading(true);
    readingsApi
      .list({ from: active.period.from, to: active.period.to, limit: 200 })
      .then((data) => {
        if (!cancelled) setChartReadings(data.readings);
      })
      .catch(() => {
        if (!cancelled) setChartReadings([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, tab]);

  const summary = active?.summary ?? {
    highest: null,
    lowest: null,
    average: null,
    totalReadings: 0,
  };

  const periodLabel = active?.period?.label ?? '';
  const prettyPeriod =
    tab === 'daily'
      ? formatLongDate(date)
      : tab === 'mtd'
        ? `${formatDate(active?.period?.from)} - ${formatDate(active?.period?.to)}`
        : formatMonth(active?.period?.from || date);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Daily, month-to-date and previous month summaries from your own readings."
        actions={
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="report-date" className="sr-only">
              Report date
            </label>
            <input
              id="report-date"
              type="date"
              className="input w-[168px] pl-9"
              value={date}
              max={todayISO()}
              onChange={(event) => setDate(event.target.value || todayISO())}
            />
          </div>
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
            onClick={() => loadReports(date)}
            className="text-sm font-semibold text-rose-700 underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Report type"
        className="mb-5 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {TABS.find((item) => item.key === tab)?.label} report
        </h2>
        <p className="text-xs text-slate-500">{prettyPeriod || periodLabel}</p>
      </div>

      {/* Metric cards */}
      <section aria-label="Report summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Highest reading"
          value={summary.highest}
          icon={TrendingUp}
          tone="rose"
          loading={loading}
        />
        <StatCard
          label="Lowest reading"
          value={summary.lowest}
          icon={TrendingDown}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          label="Average reading"
          value={formatAverage(summary.average)}
          icon={Droplets}
          tone="amber"
          loading={loading}
          hint="Rounded to one decimal place"
        />
        <StatCard
          label="Total readings"
          value={summary.totalReadings}
          unit="readings"
          icon={ClipboardList}
          tone="brand"
          loading={loading}
        />
      </section>

      {/* Empty state */}
      {!loading && active && !active.hasData ? (
        <div className="card mt-6">
          <EmptyState
            icon={ClipboardList}
            title="No readings in this period"
            description={
              tab === 'previous'
                ? 'There were no readings recorded in the previous calendar month.'
                : 'There are no readings for the selected period yet, so there is nothing to calculate.'
            }
          />
        </div>
      ) : null}

      {/* Chart - hidden when the period is empty, since the empty state above
          already explains that there is nothing to plot. */}
      {loading || active?.hasData ? (
        <section className="card mt-6" aria-label="Glucose trend chart">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <LineChartIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Glucose trend
              </h2>
              <p className="text-xs text-slate-500">
                {tab === 'daily'
                  ? 'All readings for the selected day'
                  : 'Every reading in the selected period'}
              </p>
            </div>
            <div className="hidden items-center gap-4 text-xs text-slate-500 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-brand-600" /> Reading
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-rose-400" /> 180
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-amber-400" /> 70
              </span>
            </div>
          </div>

          <div className="px-3 py-4 sm:px-5">
            {loading || chartLoading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <GlucoseTrendChart readings={chartReadings} />
            )}
          </div>
        </section>
      ) : null}

      {/* Daily breakdown */}
      {tab === 'daily' && !loading && active?.readings?.length ? (
        <section className="card mt-6" aria-label="Daily breakdown">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Readings on {formatDate(date)}</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {active.readings.map((reading) => (
              <li key={reading.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-600">
                  {reading.timeSlotLabel || reading.timeSlot}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {reading.glucoseValue}
                  <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
