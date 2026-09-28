// R-GEN-3: נפח שבועי לכל קבוצת שרירים. ראשי 1, משני 0.5
import type { Exercise, ISODate } from '../types';
import { MUSCLES, MUSCLE_IDS, type MuscleId } from '../muscles';
import { addDays, startOfWeek } from '../calc/dates';
import type { PastExercise } from './history';

export const VOLUME_MIN = 10;
export const VOLUME_MAX = 16;
export const MAJOR_MUSCLES = MUSCLE_IDS.filter((m) => MUSCLES[m].major);

/** מספר סטי העבודה שבוצעו (לפי מספר סט, לא לפי צד) */
export function workSetsCount(pe: PastExercise): number {
  return new Set(pe.sets.map((s) => s.setNumber)).size;
}

export function weeklyVolume(history: PastExercise[], exercises: Map<string, Exercise>, weekStart: ISODate): Record<MuscleId, number> {
  const end = addDays(weekStart, 6);
  const out = Object.fromEntries(MUSCLE_IDS.map((m) => [m, 0])) as Record<MuscleId, number>;
  for (const pe of history) {
    if (pe.kind !== 'regular' || pe.role !== 'work' || pe.date < weekStart || pe.date > end) continue;
    const ex = exercises.get(pe.exerciseId);
    if (!ex) continue;
    const n = workSetsCount(pe);
    for (const m of ex.primaryMuscles) out[m as MuscleId] += n;
    for (const m of ex.secondaryMuscles) out[m as MuscleId] += n * 0.5;
  }
  return out;
}

/** קבוצות שמחוץ לטווח שבועיים ברציפות (השבועות השלמים האחרונים) */
export function volumeOutOfRange(history: PastExercise[], exercises: Map<string, Exercise>, today: ISODate): { muscle: MuscleId; direction: 'add' | 'remove'; values: [number, number] }[] {
  const w1 = addDays(startOfWeek(today), -7);
  const w2 = addDays(w1, -7);
  const a = weeklyVolume(history, exercises, w2);
  const b = weeklyVolume(history, exercises, w1);
  // רק אם היו אימונים בשני השבועות
  const trained = (w: ISODate) => history.some((h) => h.kind === 'regular' && h.date >= w && h.date <= addDays(w, 6));
  if (!trained(w1) || !trained(w2)) return [];
  const out: { muscle: MuscleId; direction: 'add' | 'remove'; values: [number, number] }[] = [];
  for (const m of MAJOR_MUSCLES) {
    if (a[m] < VOLUME_MIN && b[m] < VOLUME_MIN) out.push({ muscle: m, direction: 'add', values: [a[m], b[m]] });
    if (a[m] > VOLUME_MAX && b[m] > VOLUME_MAX) out.push({ muscle: m, direction: 'remove', values: [a[m], b[m]] });
  }
  return out;
}
