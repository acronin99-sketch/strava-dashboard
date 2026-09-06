import { NextRequest, NextResponse } from 'next/server';
import { updateWorkout } from '@/lib/training/db';
import { TrainingWorkout } from '@/lib/training/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutId } = await params;
    const updates = (await request.json()) as Partial<TrainingWorkout>;

    const updatedWorkout = await updateWorkout(workoutId, updates);
    return NextResponse.json(updatedWorkout);
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update workout' },
      { status: 500 }
    );
  }
}
