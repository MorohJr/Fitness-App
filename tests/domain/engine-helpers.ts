import { buildSeedExercises } from '../../src/data/seed/exercises';
import { DEFAULT_LOCATIONS, DEFAULT_EQUIPMENT } from '../../src/data/seed/defaults';
import { DEFAULT_TEMPLATES } from '../../src/domain/rules/R-DAY';
import type { DayTemplate, Exercise, ExerciseStatus, LocationSetup } from '../../src/domain/types';
import type { PastExercise, PastSet } from '../../src/domain/engine/history';

void DEFAULT_EQUIPMENT;
export const base = { createdAt: '', updatedAt: '', deletedAt: null };

/** כל תרגילי הכוח במצב נתון. levelsGreen: עד איזו רמה 🟢, הרמה הבאה 🟡, השאר 🔴 */
export function exercisesWith(levelsGreen = 2): Exercise[] {
  return buildSeedExercises().map((e) => {
    if (e.status === null) return { ...e, ...base };
    const lvl = e.families[0].level;
    const status: ExerciseStatus = lvl <= levelsGreen ? 'green' : lvl === levelsGreen + 1 ? 'yellow' : 'red';
    return { ...e, ...base, status };
  });
}

export const templates: DayTemplate[] = DEFAULT_TEMPLATES.map((t) => ({ ...t, ...base, slots: structuredClone(t.slots) }));
export const tpl = (id: string) => templates.find((t) => t.id === id)!;
export const home: LocationSetup = DEFAULT_LOCATIONS.find((l) => l.id === 'home')!;
export const outdoor: LocationSetup = DEFAULT_LOCATIONS.find((l) => l.id === 'outdoor')!;
export const everything: LocationSetup = { id: 'outdoor', name: 'הכול', enabled: true, equipmentIds: ['dumbbells-10', 'dumbbell-bar', 'pullup-bar', 'parallel-bars', 'bench', 'bands', 'sliders', 'elevated'] };

export function session(exerciseId: string, date: string, values: number[], opts: Partial<PastExercise> & { rpe?: number; left?: number[] } = {}): PastExercise {
  const sets: PastSet[] = values.flatMap((v, i): PastSet[] =>
    opts.left
      ? [{ setNumber: i + 1, side: 'right' as const, reps: v, seconds: v, load: null, rpe: opts.rpe ?? 8 }, { setNumber: i + 1, side: 'left' as const, reps: opts.left[i], seconds: opts.left[i], load: null, rpe: opts.rpe ?? 8 }]
      : [{ setNumber: i + 1, side: 'none' as const, reps: v, seconds: v, load: null, rpe: opts.rpe ?? 8 }]
  );
  return { workoutId: 'w-' + date, date, kind: 'regular', isDeload: false, location: 'outdoor', exerciseId, family: 'horizontalPush', level: 4, role: 'work', targetMin: 6, targetMax: 12, sets, ...opts } as PastExercise;
}
