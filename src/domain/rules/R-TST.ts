// מבחן פתיחה כאימון (R-TST, פרק 6). כללים טהורים, בלי מסד ובלי ממשק
import type { Exercise, ExerciseStatus } from '../types';
import { FAMILY_META, type Category, type FamilyId } from '../families';
import { ladder, levelIn } from '../calc/exercises';
import { evaluateTest, familyStatusChanges } from './opening-test';
import { BLOCK_MINUTES, type PlannedBlock } from '../engine/buildWorkout';

/** מנוחה אחרי סט מקסימלי באותה משפחה, ובין משפחות (R-TST-5) */
export const REST_IN_FAMILY_SEC = 120;
export const REST_BETWEEN_FAMILIES_SEC = 60;
/** הערכה גסה לתכנון: כ-4 דקות למשפחה (סט או שניים ומנוחה) */
export const MIN_PER_FAMILY = 4;

export type Usable = (e: Exercise) => boolean;

const CATEGORY_ORDER: Category[] = ['push', 'pull', 'legs', 'core'];

/** R-TST-2: לסירוגין לפי קטגוריה, ובתוך קטגוריה לפי הסדר שהתקבל */
export function testOrder(families: FamilyId[]): FamilyId[] {
  const groups = CATEGORY_ORDER.map((c) => families.filter((f) => FAMILY_META[f].category === c));
  const rest = families.filter((f) => !CATEGORY_ORDER.includes(FAMILY_META[f].category));
  const out: FamilyId[] = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) {
    for (const g of groups) if (i < g.length) out.push(g[i]);
  }
  return [...out, ...rest];
}

/** R-TST-1: ברירת המחדל לבחירה, משפחות שלא נבדקו ושיש בהן תרגיל זמין */
export function defaultSelection(exercises: Exercise[], families: FamilyId[], usable: Usable): FamilyId[] {
  return families.filter((f) => {
    const lad = ladder(exercises, f);
    return lad.some(usable) && !lad.some((e) => e.status === 'green' || e.status === 'yellow');
  });
}

/** R-TST-3 / R-TST-8: התרגיל המוצע להתחלה במשפחה */
export function suggestStart(exercises: Exercise[], family: FamilyId, usable: Usable, foundation: boolean): Exercise | null {
  const lad = ladder(exercises, family).filter(usable);
  if (!lad.length) return null;
  if (foundation) return lad[0];
  const yellow = lad.find((e) => e.status === 'yellow');
  if (yellow) return yellow;
  const greens = ladder(exercises, family).filter((e) => e.status === 'green').map((e) => levelIn(e, family)!);
  if (greens.length) {
    const top = Math.max(...greens);
    return lad.find((e) => levelIn(e, family)! > top) ?? lad[lad.length - 1];
  }
  return lad[0];
}

/** R-TST-4: חימום דינמי לפני הסטים המקסימליים */
export function testWarmup(exercises: Exercise[], usable: Usable, first: Exercise | null): PlannedBlock {
  const mob = exercises.filter((e) => !e.deletedAt && e.families.some((f) => f.family === 'mobility') && usable(e)).slice(0, 3);
  return {
    key: 'warmup', title: 'חימום דינמי (חובה)', minutes: BLOCK_MINUTES.warmup,
    items: [
      ...mob.map((e) => ({ exerciseId: e.id, name: e.name, detail: `${e.targetMin}–${e.targetMax} ${e.measure === 'time' ? "שנ'" : 'חזרות'}` })),
      ...(first ? [{ exerciseId: first.id, name: first.name, detail: 'סט קל אחד, חצי ממה שאתה חושב שתעשה' }] : [])
    ]
  };
}

export interface TestTry {
  exerciseId: string;
  level: number;
}

export interface TestStep {
  status: ExerciseStatus;
  message: string;
  /** התרגיל הבא לבדיקה במשפחה, או null = המשפחה הסתיימה */
  next: Exercise | null;
  /** היה צריך לבדוק עוד רמה, אבל אין אף אחת זמינה באותו כיוון */
  nextUnavailable: boolean;
}

/**
 * R-TST-5: תוצאת סט במבחן ומה בודקים אחריו.
 * before = מה שכבר נבדק במשפחה הזו באימון הזה (לפני הסט הנוכחי)
 */
export function testStep(exercises: Exercise[], family: string, ex: Exercise, value: number, before: TestTry[], usable: Usable): TestStep {
  const level = levelIn(ex, family)!;
  const tested = [...before.map((t) => t.level), level];
  const o = evaluateTest(exercises, family, { exerciseId: ex.id, level, value }, ex.targetMin, ex.targetMax, tested);
  if (o.next.action === 'done') return { status: o.status, message: o.message, next: null, nextUnavailable: false };
  // הרמה הבאה, ואם אין בה תרגיל זמין: הקרובה באותו כיוון שעוד לא נבדקה
  const up = o.next.action === 'higher';
  const cands = ladder(exercises, family).filter((e) => {
    const l = levelIn(e, family)!;
    return usable(e) && !tested.includes(l) && (up ? l > level : l < level);
  });
  const next = (up ? cands[0] : cands[cands.length - 1]) ?? null;
  return {
    status: o.status,
    message: next ? o.message : `${o.message.split(':')[0]}. הרמה הבאה לא זמינה במיקום הזה, אפשר לבדוק אותה בפעם אחרת`,
    next,
    nextUnavailable: !next
  };
}

/** R-TST-6: שינויי הסטטוס של משפחה לפי מה שנבדק (פרק 6) */
export function testChanges(exercises: Exercise[], family: string, results: { exerciseId: string; level: number; status: ExerciseStatus }[]): Record<string, ExerciseStatus> {
  return familyStatusChanges(exercises, family, results);
}
