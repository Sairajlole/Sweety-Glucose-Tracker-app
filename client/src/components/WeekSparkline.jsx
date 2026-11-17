import { Area, AreaChart, ResponsiveContainer } from 'recharts';

/**
 * Seven-day mini sparkline of daily average glucose.
 * Decorative context for the month card - the full chart lives on Reports.
 */
export default function WeekSparkline({ points = [] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl bg-slate-50">
        <p className="text-xs text-slate-400">Log a few more days to see your weekly trend</p>
      </div>
    );
  }

  return (
    <div className="h-16 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="weekSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="avg"
            stroke="#0d9488"
            strokeWidth={1.8}
            fill="url(#weekSpark)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
