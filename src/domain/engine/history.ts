// היסטוריית ביצוע: מה שנעשה בפועל בכל תרגיל (SetLog, לעולם לא מחושב מחדש)
import type { ISODate, MeasureType, Side } from '../types';

export interface PastSet {
  setNumber: number;
  side: Side;
  reps: number | null;
  seconds: number | null;
  load: string | null;
  rpe: number | null;
}

/** תרגיל אחד באימון שהושלם */
export interface PastExercise {
  workoutId: string;
  date: ISODate;
  kind: 'regular' | 'test';
  isDeload: boolean;
  location: string;
  exerciseId: string;
  family: string;
  level: number;
  role: 'work' | 'technique' | 'warmup';
  targetMin: number;
  targetMax: number;
  sets: PastSet[];
}

/** ערך לכל סט: בחד-צדדי הצד החלש (R-PRG-1, R-BODY-5) */
export function setValues(sets: PastSet[], measure: MeasureType, unilateral: boolean): { value: number; rpe: number | null; load: string | null }[] {
  const v = (s: PastSet) => (measure === 'time' ? s.seconds : s.reps) ?? 0;
  const byNum = new Map<number, PastSet[]>();
  for (const s of sets) byNum.set(s.setNumber, [...(byNum.get(s.setNumber) ?? []), s]);
  return [...byNum.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => {
      const value = unilateral && list.length > 1 ? Math.min(...list.map(v)) : Math.max(...list.map(v));
      const rpes = list.map((s) => s.rpe).filter((r): r is number => r !== null);
      return { value, rpe: rpes.length ? Math.max(...rpes) : null, load: list[0].load };
    });
}
