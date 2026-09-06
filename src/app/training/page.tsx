'use client';

import { useEffect, useState } from 'react';
import { TrainingWorkout, WeekSummary } from '@/lib/training/types';
import { WeekView } from '@/components/training/WeekView';
import { WeekSummaryTable } from '@/components/training/WeekSummaryTable';

export default function TrainingPlanPage() {
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [planId] = useState('mock-plan-1'); // TODO: get from URL or session

  useEffect(() => {
    fetchWeeks();
  }, [planId]);

  const fetchWeeks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/training/weeks?planId=${planId}`);
      if (!response.ok) throw new Error('Failed to fetch weeks');
      const data = await response.json();
      setWeeks(data.weeks);
      if (data.weeks.length > 0 && !selectedWeek) {
        setSelectedWeek(data.weeks[0]);
      }
    } catch (err) {
      console.error('Error fetching weeks:', err);
      alert('Failed to load training plan. Make sure Supabase is configured.');
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

      // Update local state
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Plan</h1>
            <p className="text-gray-600 mt-1">Log and track your training workouts</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('overview')}
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                view === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView('detail')}
              disabled={!selectedWeek}
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                view === 'detail'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
              }`}
            >
              Detail
            </button>
          </div>
        </div>

        {/* Main Content */}
        {view === 'overview' ? (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <WeekSummaryTable
                weeks={weeks}
                selectedWeekStart={selectedWeek?.start_date}
                onWeekSelect={handleWeekSelect}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : selectedWeek ? (
          <div className="bg-white rounded-lg shadow p-6">
            <WeekView
              week={selectedWeek}
              onWorkoutSave={handleWorkoutSave}
              onWeekChange={handleWeekChange}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Select a week to view details
          </div>
        )}
      </div>
    </div>
  );
}
