import { getSupabase } from './supabase';
import { TrainingWorkout, WeekSummary } from './types';

export async function getWorkoutsForPlan(planId: string): Promise<TrainingWorkout[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_workouts')
    .select('*')
    .eq('plan_id', planId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getWeekSummary(planId: string, weekStart: string): Promise<WeekSummary | null> {
  const supabase = getSupabase();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('training_workouts')
    .select('*')
    .eq('plan_id', planId)
    .gte('date', weekStart)
    .lte('date', weekEndStr)
    .order('date', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const workouts = data as TrainingWorkout[];

  // Calculate summary stats
  const runningMiles = workouts.reduce((sum, w) => sum + (w.running_miles || 0), 0);
  const xtrainingMiles = workouts.reduce((sum, w) => sum + (w.xtraining_miles || 0), 0);
  const rpeValues = workouts.filter(w => w.rpe).map(w => w.rpe!);
  const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b) / rpeValues.length : null;
  const workload = workouts.reduce((sum, w) => {
    if (w.running_miles && w.rpe) return sum + w.running_miles * w.rpe;
    return sum;
  }, 0);
  const completedWorkouts = workouts.filter(w => w.actual_workout).length;
  const adherencePercent = Math.round((completedWorkouts / workouts.length) * 100);

  // Get week number (ISO week)
  const date = new Date(weekStart);
  const tempDate = new Date(date.getTime());
  tempDate.setDate(tempDate.getDate() - tempDate.getDay() + 4);
  const weekNum = Math.ceil((tempDate.getTime() - new Date(tempDate.getFullYear(), 0, 1).getTime()) / 86400000 / 7);

  return {
    week_number: weekNum,
    start_date: weekStart,
    end_date: weekEndStr,
    running_miles: runningMiles,
    xtraining_miles: xtrainingMiles,
    avg_rpe: avgRpe,
    workload,
    adherence_percent: adherencePercent,
    coach_summary: null,
    workouts,
  };
}

export async function updateWorkout(
  workoutId: string,
  updates: Partial<TrainingWorkout>
): Promise<TrainingWorkout> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_workouts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data as TrainingWorkout;
}

export async function createWorkout(workout: Omit<TrainingWorkout, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingWorkout> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('training_workouts')
    .insert([{ ...workout, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) throw error;
  return data as TrainingWorkout;
}
