# Training Plan Dashboard

A week-by-week training log viewer and editor for tracking workouts, coach feedback, and performance metrics.

## Features

- **Week Overview**: Table view of all weeks showing totals and adherence at a glance
- **Week Detail View**: 7-day card grid showing planned vs. actual workouts for a week
- **Inline Editing**: Click any day card to edit actual workout, RPE, miles, and notes
- **Coach Feedback**: See coach comments immediately for each workout
- **Stats**: Automatic calculation of weekly totals, averages, and adherence percentage

## Architecture

- **Mock Data**: Works out-of-the-box with generated mock data (8 weeks of training logs)
- **Supabase Integration**: Ready to connect to a real database (optional)
- **Client Components**: Interactive with real-time feedback

## Local Development

### With Mock Data (No Database Required)

```bash
npm run dev
# Visit http://localhost:3002/training
```

The app will automatically use mock data if Supabase is not configured.

### With Supabase (Real Data Storage)

1. **Create a Supabase project** (or use an existing one)

2. **Get your credentials**:
   - Project URL: From Settings → API
   - Service Role Key: From Settings → API (keep this secret!)

3. **Set environment variables**:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run the migration**:
   ```bash
   # Copy the SQL from supabase/migrations/001_create_training_tables.sql
   # Paste it into the Supabase SQL Editor and run
   ```

5. **Create sample data** (optional):
   ```sql
   -- Insert a training plan
   INSERT INTO training_plans (athlete_id, name, start_date, end_date)
   VALUES (
     '00000000-0000-0000-0000-000000000000', -- your UUID
     'Fall Training Block',
     '2024-09-01',
     '2024-10-31'
   );

   -- Get the plan_id from the insert above and use it to insert workouts
   ```

6. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Data Model

### training_plans
- `id` (UUID) - Primary key
- `athlete_id` (UUID) - User who owns this plan
- `coach_id` (UUID) - Coach who created the plan (optional)
- `name` (TEXT) - Plan name (e.g., "Fall Training Block")
- `start_date` (DATE) - First day of plan
- `end_date` (DATE) - Last day of plan

### training_workouts
- `id` (UUID) - Primary key
- `plan_id` (UUID) - FK to training_plans
- `date` (DATE) - Day of workout
- `planned_workout` (TEXT) - What coach prescribed (e.g., "W/u, 8mi easy, 4x30sec hills")
- `actual_workout` (TEXT) - What athlete actually did (optional)
- `rpe` (1-5) - Rate of Perceived Exertion (optional)
- `running_miles` (NUMERIC) - Running distance (optional)
- `xtraining_miles` (NUMERIC) - Cross-training distance like biking (optional)
- `coach_feedback` (TEXT) - Coach's comments (optional)
- `strava_activity_id` (TEXT) - Link to Strava activity (for future integration)

## UI Flows

### Overview Tab
- Shows all weeks as compact rows
- Click a row to switch to detail view for that week
- Displays: run miles, x-train miles, avg RPE, workload, adherence %, coach comment

### Detail Tab
- Shows one week at a time as 7 day cards
- Each card shows:
  - Day name and date
  - Planned workout (read-only)
  - Actual workout (editable)
  - RPE and miles metrics
  - Coach feedback
- Click "Edit" button on a card to enter edit mode
- Edit mode provides text areas and number inputs
- Click "Save" to persist changes

## Navigation

```
/training           → Training plan page
/                   → Main dashboard
/coach              → Coaching engine (separate feature)
```

## Future Enhancements

- **Strava Integration**: Click "Link Strava" on a day card to auto-populate miles from an activity
- **Multi-Athlete**: Coach view with sidebar to switch between athletes
- **Plan Generation**: Create new plans from templates or coach input
- **Analytics**: Trend charts showing weekly progression
- **Mobile**: Responsive design for phone data entry

## Troubleshooting

**"Supabase is not configured"**
- The app will automatically use mock data, so you can ignore this unless you're connecting a real database

**"Failed to load training plan"**
- Check browser console for error details
- Verify Supabase credentials in `.env.local`
- Ensure the migration ran successfully

**Edits aren't saving**
- If using mock data, edits are lost on page reload (expected)
- If using Supabase, check that network requests succeeded in DevTools

## Testing

Mock data generates 8 weeks of realistic trail-running training logs (based on Edwin Hassenstein's actual training). Each week has 7 workouts with ~90% of them having "actual" data entered.

To test with different data, edit `src/lib/training/mock-data.ts`.
