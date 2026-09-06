'use client';

import { WeekSummary } from '@/lib/training/types';

interface WeekSummaryTableProps {
  weeks: WeekSummary[];
  selectedWeekStart?: string;
  onWeekSelect: (startDate: string) => void;
  isLoading?: boolean;
}

export function WeekSummaryTable({
  weeks,
  selectedWeekStart,
  onWeekSelect,
  isLoading,
}: WeekSummaryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Week</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Dates</th>
            <th className="px-4 py-3 text-center font-semibold text-zinc-300">Run Miles</th>
            <th className="px-4 py-3 text-center font-semibold text-zinc-300">X-Train Miles</th>
            <th className="px-4 py-3 text-center font-semibold text-zinc-300">Avg RPE</th>
            <th className="px-4 py-3 text-center font-semibold text-zinc-300">Workload</th>
            <th className="px-4 py-3 text-center font-semibold text-zinc-300">Adherence</th>
            <th className="px-4 py-3 text-left font-semibold text-zinc-300">Coach Comment</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center text-zinc-500">
                Loading...
              </td>
            </tr>
          ) : weeks.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center text-zinc-500">
                No weeks found
              </td>
            </tr>
          ) : (
            weeks.map((week) => (
              <tr
                key={week.start_date}
                onClick={() => onWeekSelect(week.start_date)}
                className={`border-b border-zinc-800 cursor-pointer transition-colors ${
                  selectedWeekStart === week.start_date
                    ? 'bg-zinc-900'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                <td className="px-4 py-3 font-semibold text-zinc-100">Week {week.week_number}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {new Date(week.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                  {new Date(week.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">{week.running_miles.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-zinc-400">{week.xtraining_miles.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-zinc-400">
                  {week.avg_rpe ? week.avg_rpe.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">{week.workload.toFixed(1)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${
                      week.adherence_percent >= 80
                        ? 'bg-emerald-900/50'
                        : week.adherence_percent >= 60
                          ? 'bg-yellow-900/50'
                          : 'bg-red-900/50'
                    }`}
                  >
                    {week.adherence_percent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">
                  {week.coach_summary || '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
