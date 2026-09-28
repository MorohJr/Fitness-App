// אימונים. בשלב 2: שמירת תוצאות מבחן הפתיחה כאימון (פרק 6)
import type { Exercise, ExerciseStatus, LocationId, SetLog, Workout, WorkoutExercise } from '../../domain/types';
import { levelIn } from '../../domain/calc/exercises';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase } from './base';
import { applyStatusChanges } from './exercises';

export interface TestSetInput {
  exercise: Exercise;
  family: string;
  /** בחד-צדדי: right ו-left. אחרת: value */
  value: number | null;
  right: number | null;
  left: number | null;
  status: ExerciseStatus;
}

async function todaysTestWorkout(location: LocationId): Promise<Workout> {
  const db = getDb();
  const today = clock.today();
  const existing = alive((await db.data('workouts').where('date').equals(today).toArray()) as Workout[]).find((w) => w.kind === 'test');
  if (existing) return existing;
  const now = clock.iso();
  const w: Workout = {
    ...newBase(),
    date: today,
    kind: 'test',
    dayType: null,
    templateName: 'מבחן פתיחה',
    location,
    isDeload: false,
    recoveryScore: null,
    status: 'completed',
    startedAt: now,
    endedAt: now,
    blockMinutes: {},
    feeling: null,
    notes: ''
  };
  await db.data('workouts').add(w);
  return w;
}

/** שומר את הסטים של משפחה אחת כחלק מאימון המבחן של היום, ומחיל את שינויי הסטטוס (באישור, E2) */
export async function saveTestFamily(location: LocationId, sets: TestSetInput[], changes: Record<string, ExerciseStatus>): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.data('workouts'), db.data('workoutExercises'), db.data('setLogs'), db.data('exercises')], async () => {
    const w = await todaysTestWorkout(location);
    const order = await db.data('workoutExercises').where('workoutId').equals(w.id).count();
    let i = 0;
    for (const s of sets) {
      const ex = s.exercise;
      const we: WorkoutExercise = {
        ...newBase(),
        workoutId: w.id,
        exerciseId: ex.id,
        exerciseName: ex.name,
        family: s.family,
        level: levelIn(ex, s.family) ?? 0,
        statusAtTime: s.status,
        role: 'work',
        targetSets: 1,
        targetMin: ex.targetMin,
        targetMax: ex.targetMax,
        tempo: ex.tempo,
        targetToday: 'סט מקסימלי',
        order: order + i++
      };
      await db.data('workoutExercises').add(we);
      const measure = (v: number | null) => (ex.measure === 'time' ? { reps: null, seconds: v } : { reps: v, seconds: null });
      const logs: SetLog[] = ex.unilateral
        ? [
            { ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'right', ...measure(s.right), load: null, rpe: null },
            { ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'left', ...measure(s.left), load: null, rpe: null }
          ]
        : [{ ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'none', ...measure(s.value), load: null, rpe: null }];
      await db.data('setLogs').bulkAdd(logs);
    }
    await applyStatusChanges(changes);
  });
}

export async function listWorkouts(): Promise<Workout[]> {
  return alive((await getDb().data('workouts').toArray()) as Workout[]).sort((a, b) => b.date.localeCompare(a.date));
}
