export interface TrainingPlan {
  id: string;
  athlete_id: string;
  coach_id?: string;
  name: string;
  start_date: string; // ISO date
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingWorkout {
  id: string;
  plan_id: string;
  date: string; // ISO date (YYYY-MM-DD)
  planned_workout: string;
  actual_workout: string | null;
  rpe: number | null; // 1-5
  running_miles: number | null;
  xtraining_miles: number | null;
  coach_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekSummary {
  week_number: number;
  start_date: string;
  end_date: string;
  running_miles: number;
  xtraining_miles: number;
  avg_rpe: number | null;
  workload: number; // sum of (distance * rpe)
  adherence_percent: number; // % of workouts with actual data
  coach_summary: string | null;
  workouts: TrainingWorkout[];
}
