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
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Week</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Dates</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Run Miles</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">X-Train Miles</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Avg RPE</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Workload</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Adherence</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Coach Comment</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          ) : weeks.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                No weeks found
              </td>
            </tr>
          ) : (
            weeks.map((week) => (
              <tr
                key={week.start_date}
                onClick={() => onWeekSelect(week.start_date)}
                className={`border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedWeekStart === week.start_date
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 font-semibold text-blue-600">Week {week.week_number}</td>
                <td className="px-4 py-3 text-gray-700">
                  {new Date(week.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                  {new Date(week.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{week.running_miles.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-gray-700">{week.xtraining_miles.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {week.avg_rpe ? week.avg_rpe.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{week.workload.toFixed(1)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold text-white ${
                      week.adherence_percent >= 80
                        ? 'bg-green-600'
                        : week.adherence_percent >= 60
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                    }`}
                  >
                    {week.adherence_percent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
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
