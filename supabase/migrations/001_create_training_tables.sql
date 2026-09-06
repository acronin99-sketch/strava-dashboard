-- Training Plans table
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  coach_id UUID,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Workouts table
CREATE TABLE training_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  planned_workout TEXT NOT NULL,
  actual_workout TEXT,
  rpe SMALLINT CHECK (rpe >= 1 AND rpe <= 5),
  running_miles NUMERIC(5, 2),
  xtraining_miles NUMERIC(5, 2),
  coach_feedback TEXT,
  strava_activity_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, date)
);

-- Create indexes
CREATE INDEX idx_training_workouts_plan_id ON training_workouts(plan_id);
CREATE INDEX idx_training_workouts_date ON training_workouts(date);
CREATE INDEX idx_training_plans_athlete_id ON training_plans(athlete_id);

-- Enable RLS
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_workouts ENABLE ROW LEVEL SECURITY;

-- Create policies (basic: users can only see their own plans)
CREATE POLICY "Users can view their own plans"
  ON training_plans FOR SELECT
  USING (auth.uid() = athlete_id OR auth.uid() = coach_id);

CREATE POLICY "Users can update their own plans"
  ON training_plans FOR UPDATE
  USING (auth.uid() = athlete_id OR auth.uid() = coach_id);

CREATE POLICY "Users can view their plan's workouts"
  ON training_workouts FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE auth.uid() = athlete_id OR auth.uid() = coach_id
    )
  );

CREATE POLICY "Athlete and coach can update workouts"
  ON training_workouts FOR UPDATE
  USING (
    plan_id IN (
      SELECT id FROM training_plans
      WHERE auth.uid() = athlete_id OR auth.uid() = coach_id
    )
  );
