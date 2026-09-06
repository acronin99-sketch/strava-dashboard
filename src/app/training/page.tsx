'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TrainingWorkout, WeekSummary } from '@/lib/training/types';
import { WeekView } from '@/components/training/WeekView';
import { WeekSummaryTable } from '@/components/training/WeekSummaryTable';

export default function TrainingPlanPage() {
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [planId, setPlanId] = useState('');

  const handleLoadPlan = async () => {
    if (!planId.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/training/weeks?planId=${planId}`);
      if (!response.ok) throw new Error('Failed to fetch weeks');
      const data = await response.json();
      setWeeks(data.weeks);
      if (data.weeks.length > 0) {
        setSelectedWeek(data.weeks[0]);
        setView('overview');
      }
    } catch (err) {
      console.error('Error fetching weeks:', err);
      alert('Failed to load training plan. Check the plan ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkoutSave = async (workoutId: string, updates: Partial<TrainingWorkout>) => {
    try {
      const response = await fetch(`/api/training/workouts/${workoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save workout');

      if (selectedWeek) {
        const updatedWorkouts = selectedWeek.workouts.map((w) =>
          w.id === workoutId ? { ...w, ...updates } : w
        );
        setSelectedWeek({
          ...selectedWeek,
          workouts: updatedWorkouts,
        });
      }
    } catch (err) {
      console.error('Error saving workout:', err);
      throw err;
    }
  };

  const handleWeekSelect = (startDate: string) => {
    const week = weeks.find((w) => w.start_date === startDate);
    if (week) {
      setSelectedWeek(week);
      setView('detail');
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (!selectedWeek) return;
    const currentIndex = weeks.findIndex((w) => w.start_date === selectedWeek.start_date);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (weeks[newIndex]) {
      setSelectedWeek(weeks[newIndex]);
    }
  };

  if (weeks.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-xs text-zinc-400 transition-colors hover:text-zinc-200 mb-4"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Training Plan</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Log and review your training workouts week by week
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Load a training plan</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Enter your plan ID to view your training log. Plans are stored in Supabase.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadPlan()}
                placeholder="Enter plan ID (e.g., mock-plan-1)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
              <button
                onClick={handleLoadPlan}
                disabled={isLoading || !planId.trim()}
                className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Load Plan'}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs text-zinc-400 transition-colors hover:text-zinc-200 mb-4"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            {selectedWeek && view === 'detail'
              ? `Week of ${new Date(selectedWeek.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Training Plan'}
          </h1>
        </div>
        {weeks.length > 0 && (
          <nav className="inline-flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
            <button
              onClick={() => setView('overview')}
              aria-current={view === 'overview' ? 'page' : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
                view === 'overview'
                  ? 'bg-zinc-800 font-medium text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView('detail')}
              disabled={!selectedWeek}
              aria-current={view === 'detail' ? 'page' : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
                view === 'detail'
                  ? 'bg-zinc-800 font-medium text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Detail
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      {view === 'overview' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
          <WeekSummaryTable
            weeks={weeks}
            selectedWeekStart={selectedWeek?.start_date}
            onWeekSelect={handleWeekSelect}
            isLoading={isLoading}
          />
        </div>
      ) : selectedWeek ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
          <WeekView
            week={selectedWeek}
            onWorkoutSave={handleWorkoutSave}
            onWeekChange={handleWeekChange}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
          Select a week to view details
        </div>
      )}
    </main>
  );
}
