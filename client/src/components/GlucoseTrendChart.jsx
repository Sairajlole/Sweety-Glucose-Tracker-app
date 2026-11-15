import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '../utils/dates';
import EmptyState from './EmptyState';
import { LineChart as LineChartIcon } from 'lucide-react';

const SLOT_SHORT = {
  MORNING: 'Morning',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{formatDate(point.readingDate)}</p>
      <p className="text-xs text-slate-400">{SLOT_SHORT[point.timeSlot] || point.timeSlot}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">
        {point.value} <span className="text-xs font-normal text-slate-400">mg/dL</span>
      </p>
    </div>
  );
}

/**
 * Glucose trend across the selected month.
 * Values are plotted in chronological order, with the common target band
 * (70-180 mg/dL) marked by reference lines.
 */
export default function GlucoseTrendChart({ readings = [] }) {
  const slotOrder = { MORNING: 0, AFTER_BREAKFAST: 1, AFTER_LUNCH: 2, AFTER_DINNER: 3 };

  // Oldest first so the line reads left to right. Readings within a day are
  // spread along a fraction of that day's position, so two readings on the
  // same date do not collapse onto a single x value and the chronological
  // order is preserved visually.
  const data = [...readings]
    .sort((a, b) => {
      if (a.readingDate !== b.readingDate) return a.readingDate < b.readingDate ? -1 : 1;
      return (slotOrder[a.timeSlot] ?? 0) - (slotOrder[b.timeSlot] ?? 0);
    })
    .map((reading) => {
      const day = Number(reading.readingDate.split('-')[2]);
      return {
        readingDate: reading.readingDate,
        timeSlot: reading.timeSlot,
        value: reading.glucoseValue,
        x: day + (slotOrder[reading.timeSlot] ?? 0) * 0.22,
      };
    });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No data to chart"
        description="Add readings for this period and the trend line will appear here."
      />
    );
  }

  const lastDay = Math.max(...data.map((point) => Math.ceil(point.x)));
  const step = Math.max(1, Math.ceil(lastDay / 7));
  const ticks = [];
  for (let day = 1; day <= lastDay; day += step) ticks.push(day);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[1, lastDay]}
            ticks={ticks}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={[40, 'dataMax + 40']}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
          <ReferenceLine y={180} stroke="#fb7185" strokeDasharray="4 4" strokeOpacity={0.6} />
          <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3, fill: '#0d9488', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#0f766e' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
