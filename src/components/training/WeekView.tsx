'use client';

import { TrainingWorkout, WeekSummary } from '@/lib/training/types';
import { DayCard } from './DayCard';

interface WeekViewProps {
  week: WeekSummary;
  onWorkoutSave: (workoutId: string, updates: Partial<TrainingWorkout>) => Promise<void>;
  isLoading?: boolean;
  onWeekChange?: (direction: 'prev' | 'next') => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeekView({ week, onWorkoutSave, isLoading, onWeekChange }: WeekViewProps) {
  const startDate = new Date(week.start_date);

  const formatDate = (offset: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Week Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Week of {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h2>
          <div className="text-xs text-zinc-500 mt-1">
            {week.running_miles.toFixed(1)} mi run • {week.xtraining_miles.toFixed(1)} mi x-train
            {week.avg_rpe && ` • Avg RPE: ${week.avg_rpe.toFixed(1)}`}
            {` • Workload: ${week.workload.toFixed(1)}`}
            {` • ${week.adherence_percent}% adherence`}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => onWeekChange?.('prev')}
            className="px-3 py-2 border border-zinc-700 rounded text-xs hover:bg-zinc-900 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => onWeekChange?.('next')}
            className="px-3 py-2 border border-zinc-700 rounded text-xs hover:bg-zinc-900 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day Cards Grid */}
      <div className="grid grid-cols-7 gap-3">
        {week.workouts.map((workout, index) => (
          <DayCard
            key={workout.id}
            day={DAYS[index]}
            date={formatDate(index)}
            workout={workout}
            onSave={(updates) => onWorkoutSave(workout.id, updates)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
