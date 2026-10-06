// מבחן פתיחה כאימון מודרך (R-TST, פרק 6). מצב המבחן ומעברים טהורים, בלי מסד ובלי ממשק
import type { Exercise, ExerciseStatus, LocationId } from '../types';
import { FAMILY_META, type Category, type FamilyId } from '../families';
import { ladder, levelIn } from '../calc/exercises';
import { evaluateTest, familyStatusChanges, testValue, type TestNext } from './opening-test';

/** מנוחה אחרי סט מקסימלי באותה משפחה, ובין משפחות (R-TST-4, R-TST-5) */
export const REST_IN_FAMILY_SEC = 120;
export const REST_BETWEEN_FAMILIES_SEC = 60;

export interface TestSetDraft {
  exerciseId: string;
  level: number;
  value: number | null;
  right: number | null;
  left: number | null;
  status: ExerciseStatus;
  next: TestNext;
  message: string;
}

export interface TestSession {
  v: 1;
  foundation: boolean;
  location: LocationId;
  /** שעת התחלה (ms) */
  startedAt: number;
  /** כל המשפחות שנבחרו, בסדר הבדיקה */
  families: FamilyId[];
  /** אינדקס המשפחה הנוכחית ב-families. שווה לאורך = המבחן הסתיים */
  index: number;
  confirmed: FamilyId[];
  skipped: FamilyId[];
  /** סטים של המשפחה הנוכחית, עוד לא נשמרו */
  sets: TestSetDraft[];
  /** התרגיל שבודקים עכשיו. null = בוחרים רמה ראשונה */
  current: string | null;
  /** test = בודקים, review = סיכום המשפחה ממתין לאישור */
  phase: 'test' | 'review';
  /** הרמה הבאה לא זמינה במיקום (מוצג בסיכום) */
  nextUnavailable: boolean;
  restEndsAt: number | null;
}

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
  const all = ladder(exercises, family);
  const yellow = lad.find((e) => e.status === 'yellow');
  if (yellow) return yellow;
  const greens = all.filter((e) => e.status === 'green').map((e) => levelIn(e, family)!);
  if (greens.length) {
    const top = Math.max(...greens);
    return lad.find((e) => levelIn(e, family)! > top) ?? lad[lad.length - 1];
  }
  return lad[0];
}

export function startSession(o: { exercises: Exercise[]; families: FamilyId[]; location: LocationId; foundation: boolean; usable: Usable; now: number }): TestSession {
  const families = testOrder(o.families);
  const s: TestSession = {
    v: 1, foundation: o.foundation, location: o.location, startedAt: o.now, families, index: 0,
    confirmed: [], skipped: [], sets: [], current: null, phase: 'test', nextUnavailable: false, restEndsAt: null
  };
  return withStart(s, o.exercises, o.usable);
}

/** המשפחה הנוכחית, או null אם המבחן הסתיים */
export function currentFamily(s: TestSession): FamilyId | null {
  return s.families[s.index] ?? null;
}

export function sessionDone(s: TestSession): boolean {
  return s.index >= s.families.length;
}

/** מכין את התרגיל הראשון של המשפחה הנוכחית (R-TST-3) */
function withStart(s: TestSession, exercises: Exercise[], usable: Usable): TestSession {
  const f = currentFamily(s);
  if (!f) return { ...s, current: null };
  return { ...s, current: suggestStart(exercises, f, usable, s.foundation)?.id ?? null };
}

/** בחירה ידנית של תרגיל (רמה ראשונה או "החלף תרגיל") */
export function chooseExercise(s: TestSession, exerciseId: string): TestSession {
  return { ...s, current: exerciseId, phase: 'test' };
}

/** R-TST-4: רישום סט. מחזיר שגיאה בעברית אם התוצאה חסרה */
export function recordSet(
  s: TestSession,
  exercises: Exercise[],
  usable: Usable,
  input: { value: number | null; right: number | null; left: number | null },
  now: number
): TestSession | { error: string } {
  const f = currentFamily(s);
  const ex = exercises.find((e) => e.id === s.current);
  if (!f || !ex) return { error: 'אין תרגיל לבדיקה' };
  const v = testValue(input.right, input.left, input.value, ex.unilateral);
  if (v === null || v < 0) return { error: ex.unilateral ? 'הזן תוצאה לשני הצדדים' : 'הזן תוצאה' };
  const level = levelIn(ex, f)!;
  const outcome = evaluateTest(exercises, f, { exerciseId: ex.id, level, value: v }, ex.targetMin, ex.targetMax, [...s.sets.map((d) => d.level), level]);
  const set: TestSetDraft = {
    exerciseId: ex.id, level,
    value: ex.unilateral ? null : input.value,
    right: ex.unilateral ? input.right : null,
    left: ex.unilateral ? input.left : null,
    status: outcome.status, next: outcome.next, message: outcome.message
  };
  const sets = [...s.sets, set];
  if (outcome.next.action === 'done') return { ...s, sets, current: null, phase: 'review', nextUnavailable: false, restEndsAt: null };
  // הרמה הבאה, ואם אין בה תרגיל זמין: הקרובה באותו כיוון שעוד לא נבדקה
  const up = outcome.next.action === 'higher';
  const tested = new Set(sets.map((d) => d.level));
  const candidates = ladder(exercises, f).filter((e) => usable(e) && !tested.has(levelIn(e, f)!) && (up ? levelIn(e, f)! > level : levelIn(e, f)! < level));
  const option = up ? candidates[0] : candidates[candidates.length - 1];
  if (!option) return { ...s, sets, current: null, phase: 'review', nextUnavailable: true, restEndsAt: null };
  return { ...s, sets, current: option.id, phase: 'test', nextUnavailable: false, restEndsAt: now + REST_IN_FAMILY_SEC * 1000 };
}

/** "מחק סט אחרון": חוזרים לתרגיל של הסט שנמחק */
export function undoLastSet(s: TestSession): TestSession {
  const last = s.sets[s.sets.length - 1];
  if (!last) return s;
  return { ...s, sets: s.sets.slice(0, -1), current: last.exerciseId, phase: 'test', nextUnavailable: false, restEndsAt: null };
}

/** חלופות לתרגיל הנוכחי באותה רמה (או כל הסולם אם עוד לא נעשה סט במשפחה) */
export function swapOptions(s: TestSession, exercises: Exercise[]): Exercise[] {
  const f = currentFamily(s);
  if (!f) return [];
  const lad = ladder(exercises, f);
  if (!s.sets.length) return lad;
  const cur = exercises.find((e) => e.id === s.current);
  const lvl = cur ? levelIn(cur, f) : null;
  return lad.filter((e) => levelIn(e, f) === lvl);
}

/** שינויי הסטטוס של המשפחה הנוכחית (פרק 6) */
export function sessionChanges(s: TestSession, exercises: Exercise[]): Record<string, ExerciseStatus> {
  const f = currentFamily(s);
  if (!f) return {};
  return familyStatusChanges(exercises, f, s.sets.map((d) => ({ exerciseId: d.exerciseId, level: d.level, status: d.status })));
}

/** מעבר למשפחה הבאה. confirmed = אושר ונשמר, אחרת דילוג או ביטול (R-TST-5) */
export function nextFamily(s: TestSession, exercises: Exercise[], usable: Usable, confirmed: boolean, now: number): TestSession {
  const f = currentFamily(s);
  if (!f) return s;
  const hadSets = s.sets.length > 0;
  const moved: TestSession = {
    ...s,
    index: s.index + 1,
    confirmed: confirmed ? [...s.confirmed, f] : s.confirmed,
    skipped: confirmed ? s.skipped : [...s.skipped, f],
    sets: [], phase: 'test', nextUnavailable: false,
    restEndsAt: hadSets && s.index + 1 < s.families.length ? now + REST_BETWEEN_FAMILIES_SEC * 1000 : null
  };
  return withStart(moved, exercises, usable);
}

/** מצב שנשמר תקין? (גרסה, ותרגילים שעדיין קיימים) */
export function isValidSession(x: unknown, exercises: Exercise[]): x is TestSession {
  const s = x as TestSession | null;
  if (!s || s.v !== 1 || !Array.isArray(s.families) || !Array.isArray(s.sets)) return false;
  const ids = new Set(exercises.map((e) => e.id));
  return s.sets.every((d) => ids.has(d.exerciseId)) && (s.current === null || ids.has(s.current));
}
