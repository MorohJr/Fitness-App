// מבחן פתיחה (פרק 6)
import type { Exercise, ExerciseStatus } from '../types';
import { ladder, levelIn } from '../calc/exercises';

export interface TestResult {
  exerciseId: string;
  level: number;
  /** חזרות או שניות. בחד-צדדי: הצד החלש */
  value: number;
}

export type TestNext = { action: 'higher'; level: number } | { action: 'lower'; level: number } | { action: 'done' };

export interface TestOutcome {
  status: ExerciseStatus;
  next: TestNext;
  message: string;
}

/** הערך הקובע: בחד-צדדי הצד החלש (R-PRG-1) */
export function testValue(right: number | null, left: number | null, single: number | null, unilateral: boolean): number | null {
  if (!unilateral) return single;
  if (right === null || left === null) return null;
  return Math.min(right, left);
}

/**
 * תוצאה של סט אחד במבחן.
 * testedLevels = רמות שכבר נבדקו במבחן של המשפחה הזו (כדי לא לחזור לרמה שנבדקה)
 */
export function evaluateTest(
  exercises: Exercise[],
  family: string,
  result: TestResult,
  targetMin: number,
  targetMax: number,
  testedLevels: number[]
): TestOutcome {
  const levels = [...new Set(ladder(exercises, family).map((e) => levelIn(e, family)!))];
  const higher = levels.filter((l) => l > result.level).sort((a, b) => a - b)[0];
  const lower = levels.filter((l) => l < result.level).sort((a, b) => b - a)[0];
  const alreadyTested = (l: number | undefined) => l !== undefined && testedLevels.includes(l);

  if (result.value > targetMax) {
    if (higher !== undefined && !alreadyTested(higher)) {
      return { status: 'green', next: { action: 'higher', level: higher }, message: 'מעל הטווח: שליטה מלאה. עוברים לבדוק את הרמה הבאה' };
    }
    return { status: 'green', next: { action: 'done' }, message: higher === undefined ? 'מעל הטווח ברמה הגבוהה ביותר' : 'מעל הטווח' };
  }
  if (result.value >= targetMin) {
    return { status: 'yellow', next: { action: 'done' }, message: 'בתוך הטווח: זו הרמה שלך להתקדמות' };
  }
  if (lower === undefined) {
    return { status: 'yellow', next: { action: 'done' }, message: 'הרמה הקלה ביותר: מתחילים ממה שביצעת' };
  }
  if (alreadyTested(lower)) {
    return { status: 'red', next: { action: 'done' }, message: 'מתחת לטווח. הרמה הקלה יותר כבר נבדקה' };
  }
  return { status: 'red', next: { action: 'lower', level: lower }, message: 'מתחת לטווח: בודקים את הרמה הקלה יותר' };
}

/**
 * שינויי הסטטוס של משפחה אחרי המבחן (פרק 6):
 * - כל תרגיל שנבדק מקבל את התוצאה שלו
 * - 🟡 או 🟢: כל הרמות הקלות ממנו 🟢 (חוץ מתרגילים שנבדקו)
 * מחזיר רק שינויים לעומת המצב הנוכחי
 */
export function familyStatusChanges(
  exercises: Exercise[],
  family: string,
  results: { exerciseId: string; level: number; status: ExerciseStatus }[]
): Record<string, ExerciseStatus> {
  const next: Record<string, ExerciseStatus> = {};
  const tested = new Set(results.map((r) => r.exerciseId));
  for (const r of results) next[r.exerciseId] = r.status;
  const passing = results.filter((r) => r.status !== 'red').map((r) => r.level);
  const top = passing.length ? Math.max(...passing) : null;
  if (top !== null) {
    for (const ex of ladder(exercises, family)) {
      const lvl = levelIn(ex, family)!;
      if (lvl < top && !tested.has(ex.id)) next[ex.id] = 'green';
    }
  }
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return Object.fromEntries(Object.entries(next).filter(([id, st]) => byId.get(id)?.status !== st));
}

/** האם במשפחה יש תרגיל 🟢 או 🟡 (בדיקת הקבלה של שלב 2) */
export function familyReady(exercises: Exercise[], family: string): boolean {
  return ladder(exercises, family).some((e) => e.status === 'green' || e.status === 'yellow');
}
