import { NextRequest, NextResponse } from 'next/server';
import { TrainingWorkout, WeekSummary } from '@/lib/training/types';
import { generateMockWorkouts } from '@/lib/training/mock-data';

async function getWorkouts(planId: string): Promise<TrainingWorkout[]> {
  // Try to fetch from Supabase if configured, otherwise use mock data
  try {
    const { getWorkoutsForPlan } = await import('@/lib/training/db');
    return await getWorkoutsForPlan(planId);
  } catch (err) {
    console.warn('Supabase not configured, using mock data:', err);
    return generateMockWorkouts();
  }
}

export async function GET(request: NextRequest) {
  try {
    const planId = request.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    // Fetch all workouts for the plan
    const workouts = await getWorkouts(planId);

    // Group by week (ISO week)
    const weekMap = new Map<string, TrainingWorkout[]>();

    workouts.forEach((workout) => {
      const date = new Date(workout.date);
      date.setDate(date.getDate() - date.getDay() + 1); // Start of week (Monday)
      const weekStart = date.toISOString().split('T')[0];

      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, []);
      }
      weekMap.get(weekStart)!.push(workout);
    });

    // Convert to WeekSummary format
    const weeks: WeekSummary[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, workouts]) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Calculate stats
        const runningMiles = workouts.reduce((sum, w) => sum + (w.running_miles || 0), 0);
        const xtrainingMiles = workouts.reduce((sum, w) => sum + (w.xtraining_miles || 0), 0);
        const rpeValues = workouts.filter((w) => w.rpe).map((w) => w.rpe!);
        const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((a, b) => a + b) / rpeValues.length : null;
        const workload = workouts.reduce((sum, w) => {
          if (w.running_miles && w.rpe) return sum + w.running_miles * w.rpe;
          return sum;
        }, 0);
        const completedWorkouts = workouts.filter((w) => w.actual_workout).length;
        const adherencePercent = Math.round((completedWorkouts / workouts.length) * 100);

        // Calculate week number
        const tempDate = new Date(weekStart);
        tempDate.setDate(tempDate.getDate() + 4);
        const weekNum = Math.ceil(
          (tempDate.getTime() - new Date(tempDate.getFullYear(), 0, 1).getTime()) / 86400000 / 7
        );

        return {
          week_number: weekNum,
          start_date: weekStart,
          end_date: weekEndStr,
          running_miles: runningMiles,
          xtraining_miles: xtrainingMiles,
          avg_rpe: avgRpe,
          workload,
          adherence_percent: adherencePercent,
          coach_summary: null, // TODO: extract from coach feedback in workouts
          workouts,
        };
      });

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error('Error fetching weeks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weeks' },
      { status: 500 }
    );
  }
}
