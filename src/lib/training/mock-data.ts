import { TrainingWorkout } from './types';

// Generate mock data based on Edwin's training log (for local testing)
export function generateMockWorkouts(): TrainingWorkout[] {
  const startDate = new Date('2024-09-01');
  const workouts: TrainingWorkout[] = [];

  // Generate 8 weeks of workouts
  for (let week = 0; week < 8; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + week * 7);

    const weekPlans = [
      {
        planned: 'Rest day! (Optional practice w/u and fleshman routines)',
        actual: 'Practiced warm up and went for a bike ride ~30 miles',
        rpe: null,
        runMiles: 0,
        xtrainMiles: 30,
        coach: 'Excellent!',
      },
      {
        planned: 'W/u, 8mi easy, 4x30sec hills, stability',
        actual: 'W/u, 8 miles, 4x30 sec hill strides. Felt great.',
        rpe: 3,
        runMiles: 8.12,
        xtrainMiles: 0,
        coach: 'Crushing it! Way to be proactive.',
      },
      {
        planned: 'W/u, 10mi easy, strength + optional x-train double',
        actual: 'Easy 10 miles on Magnolia (9:40/mi, 1000ft gain). Strength after.',
        rpe: 3,
        runMiles: 10.01,
        xtrainMiles: 2,
        coach: 'Absolutely crushing it!',
      },
      {
        planned: 'W/u, 8mi easy, 5x20sec hills',
        actual: '10 miles easy on Mags. Felt sluggish early.',
        rpe: 3,
        runMiles: 10.07,
        xtrainMiles: 0,
        coach: 'Solid effort!',
      },
      {
        planned: 'W/u, 30-45min easy x-train',
        actual: 'W/u, 30 mins drills/jog (rain)',
        rpe: 1,
        runMiles: 0,
        xtrainMiles: 2,
        coach: 'Solid!',
      },
      {
        planned: 'W/u, 14-16mi easy on trails, strength',
        actual: '17 miles around Turquoise Lake. Strength after.',
        rpe: 2,
        runMiles: 17,
        xtrainMiles: 2,
        coach: 'Epic adventure!',
      },
      {
        planned: 'W/u, 8-10mi easy on trails, 4x20sec hills, stability',
        actual: '12 miles up Mt. Belford w/ 4x20 strides. Stability after.',
        rpe: 3,
        runMiles: 12,
        xtrainMiles: 0,
        coach: 'Legendary weekend!',
      },
    ];

    weekPlans.forEach((plan, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayIndex);
      const dateStr = date.toISOString().split('T')[0];

      workouts.push({
        id: `mock-${week}-${dayIndex}`,
        plan_id: 'mock-plan-1',
        date: dateStr,
        planned_workout: plan.planned,
        actual_workout: Math.random() > 0.1 ? plan.actual : null, // 90% logged
        rpe: plan.rpe,
        running_miles: plan.runMiles || null,
        xtraining_miles: plan.xtrainMiles || null,
        coach_feedback: plan.coach,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  return workouts;
}
