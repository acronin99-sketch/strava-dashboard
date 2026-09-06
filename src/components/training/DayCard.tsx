'use client';

import { useState } from 'react';
import { TrainingWorkout } from '@/lib/training/types';

interface DayCardProps {
  day: string; // Mon, Tue, etc
  date: string; // Jun 19
  workout: TrainingWorkout;
  onSave: (updates: Partial<TrainingWorkout>) => Promise<void>;
  isLoading?: boolean;
}

export function DayCard({ day, date, workout, onSave, isLoading }: DayCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [actual, setActual] = useState(workout.actual_workout || '');
  const [rpe, setRpe] = useState(workout.rpe?.toString() || '');
  const [runMiles, setRunMiles] = useState(workout.running_miles?.toString() || '');
  const [xtrainMiles, setXtrainMiles] = useState(workout.xtraining_miles?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        actual_workout: actual || null,
        rpe: rpe ? parseInt(rpe) : null,
        running_miles: runMiles ? parseFloat(runMiles) : null,
        xtraining_miles: xtrainMiles ? parseFloat(xtrainMiles) : null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save workout:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setActual(workout.actual_workout || '');
    setRpe(workout.rpe?.toString() || '');
    setRunMiles(workout.running_miles?.toString() || '');
    setXtrainMiles(workout.xtraining_miles?.toString() || '');
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-56 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 min-h-56 flex flex-col hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-gray-100">
        <div className="font-semibold text-blue-600 text-sm">{day}</div>
        <div className="text-xs text-gray-500">{date}</div>
      </div>

      {isEditing ? (
        <>
          {/* Edit Mode */}
          <div className="flex-1 space-y-2 text-sm">
            {/* Planned (read-only in edit mode) */}
            <div className="mb-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Planned</label>
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-16 overflow-y-auto">
                {workout.planned_workout}
              </div>
            </div>

            {/* Actual (editable) */}
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">Actual</label>
              <textarea
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="What did you actually do?"
              />
            </div>

            {/* RPE */}
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500">RPE (1-5)</label>
              <select
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className="w-full text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                <option value="1">1 (Very Easy)</option>
                <option value="2">2 (Easy)</option>
                <option value="3">3 (Moderate)</option>
                <option value="4">4 (Hard)</option>
                <option value="5">5 (Max Effort)</option>
              </select>
            </div>

            {/* Miles */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Run Mi</label>
                <input
                  type="number"
                  step="0.1"
                  value={runMiles}
                  onChange={(e) => setRunMiles(e.target.value)}
                  className="w-full text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">X-train Mi</label>
                <input
                  type="number"
                  step="0.1"
                  value={xtrainMiles}
                  onChange={(e) => setXtrainMiles(e.target.value)}
                  className="w-full text-xs p-1.5 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 text-xs font-semibold bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded py-1.5 hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {/* View Mode */}
          <div className="flex-1 space-y-1.5 text-xs">
            {/* Planned */}
            <div>
              <div className="font-semibold uppercase text-gray-500 text-xs mb-0.5">Planned</div>
              <div className="text-gray-600 bg-gray-50 p-1.5 rounded">{workout.planned_workout}</div>
            </div>

            {/* Actual */}
            <div>
              <div className="font-semibold uppercase text-gray-500 text-xs mb-0.5">Actual</div>
              <div className="text-gray-800 bg-white border border-gray-100 p-1.5 rounded min-h-12">
                {workout.actual_workout ? (
                  <div className="text-gray-700">{workout.actual_workout}</div>
                ) : (
                  <div className="text-gray-400 italic">Not logged yet</div>
                )}
              </div>
            </div>

            {/* Metrics */}
            {(workout.rpe || workout.running_miles || workout.xtraining_miles) && (
              <div className="flex gap-1 flex-wrap">
                {workout.rpe && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">
                    RPE {workout.rpe}
                  </span>
                )}
                {workout.running_miles && (
                  <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                    {workout.running_miles.toFixed(1)} mi run
                  </span>
                )}
                {workout.xtraining_miles && (
                  <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                    {workout.xtraining_miles.toFixed(1)} mi x-train
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Coach Feedback */}
          {workout.coach_feedback && (
            <div className="bg-blue-50 border-l-2 border-blue-500 p-1.5 mt-auto rounded text-xs text-blue-700">
              <div className="font-semibold mb-0.5">Coach:</div>
              <div>{workout.coach_feedback}</div>
            </div>
          )}

          {/* Edit Button */}
          <button
            onClick={() => setIsEditing(true)}
            className="mt-2 w-full text-xs font-semibold bg-blue-50 text-blue-600 rounded py-1 hover:bg-blue-100 transition-colors"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
