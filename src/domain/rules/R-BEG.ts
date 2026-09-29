// R-BEG: תוכנית יסודות למתחילים מאפס. לוגיקה בלבד
import type { Exercise, Injury, ISODate, LocationSetup, WeekPlanVersion } from '../types';
import type { PastExercise } from '../engine/history';
import { setValues } from '../engine/history';
import { availableAt, ladder, levelIn } from '../calc/exercises';
import { isBlocked } from './R-INJ';
import type { ProgressionSuggestion } from './R-PRG';
import type { FamilyId } from '../families';
import { addDays, daysBetween, startOfWeek } from '../calc/dates';
import { versionForDate } from './R-VER';

export const FOUNDATION_WEEKS = 6;

/** R-BEG-2: 11 משפחות היסודות, שנבדקות בבדיקת הרמה */
export const FOUNDATION_FAMILIES: FamilyId[] = [
  'horizontalPush', 'verticalPush', 'verticalPull', 'horizontalPull', 'squat', 'hipHinge', 'singleLeg', 'calves', 'coreFront', 'coreSide', 'plank'
];

/** R-BEG-4: בלוקים באימון יסודות (דקות). כוח עד 30, סה"כ עד 60 */
export const FOUNDATION_BLOCK_MINUTES = { warmup: 6, cardio: 8, stretch: 8, posture: 3, jaw: 2, meditation: 3 };
export const FOUNDATION_STRENGTH_LIMIT_SEC = 30 * 60;
export const FOUNDATION_TOTAL_LIMIT_SEC = 60 * 60;
/** R-BEG-4: יום הליכה ומוביליטי */
export const WALK_DAY_MINUTES = { cardio: 25, mobility: 10, stretch: 10 };

export interface FoundationInfo {
  /** היום שבו התחילה התוכנית (לא בהכרח יום ראשון, R-BEG-2) */
  start: ISODate;
  /** שבוע בתוכנית (1 = הראשון). יכול לעבור את 6 אם עוד לא עברו לתוכנית הרגילה */
  week: number;
}

const isFoundation = (v: WeekPlanVersion | null) => v?.program === 'foundation';

/**
 * האם התאריך בתוכנית יסודות, ובאיזה שבוע.
 * ההתחלה = תחילת הרצף הרציף של גרסאות יסודות שמסתיים בגרסה של התאריך
 */
export function foundationOn(versions: WeekPlanVersion[], date: ISODate): FoundationInfo | null {
  const live = versions.filter((v) => !v.deletedAt).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const cur = versionForDate(live, date);
  if (!isFoundation(cur)) return null;
  let i = live.indexOf(cur!);
  while (i > 0 && isFoundation(live[i - 1])) i--;
  const start = live[i].effectiveFrom;
  // R-BEG-2: שבוע 1 = 7 הימים הראשונים מיום ההתחלה
  return { start, week: Math.floor(daysBetween(start, date) / 7) + 1 };
}

/** גרסת יסודות שנקבעה לעתיד (אחרי שנשמרה ולפני שהתחילה) */
export function pendingFoundation(versions: WeekPlanVersion[], today: ISODate): WeekPlanVersion | null {
  return versions.find((v) => !v.deletedAt && v.program === 'foundation' && v.effectiveFrom > today) ?? null;
}

/** R-BEG-4: שבועות 1–2 = 2 סטים ו-RPE 6–7. משבוע 3: הסטים של התבנית */
export function foundationSets(templateSets: number, week: number): { sets: number; rpeTarget: string | null } {
  return week <= 2 ? { sets: 2, rpeTarget: '6–7' } : { sets: templateSets, rpeTarget: null };
}

/** R-BEG-6: מהשבוע השישי מוצע מעבר, כך שהתוכנית הרגילה מתחילה בשבוע השביעי */
export function foundationDue(info: FoundationInfo | null): boolean {
  return !!info && info.week >= FOUNDATION_WEEKS;
}

/** R-BEG-6: המשפחות שנבדקות בסוף התוכנית */
export function remainingTestFamilies(strengthFamilies: FamilyId[]): FamilyId[] {
  return strengthFamilies.filter((f) => !FOUNDATION_FAMILIES.includes(f));
}

/**
 * R-BEG-5 + R-DL-1: שבוע תחילת הספירה של הורדת עומס =
 * השבוע של האימון הרגיל הראשון שהושלם מחוץ לתוכנית יסודות
 */
export function deloadProgramStart(completedDates: ISODate[], versions: WeekPlanVersion[]): ISODate | null {
  // אימון לפני תחילת היסודות (למשל עד יום ראשון) לא מתחיל את הספירה
  const beforeFoundation = (d: ISODate) => versions.some((v) => !v.deletedAt && v.program === 'foundation' && v.effectiveFrom > d);
  const first = [...completedDates].sort().find((d) => !foundationOn(versions, d) && !beforeFoundation(d));
  return first ? startOfWeek(first) : null;
}

/** יום אחרון בשבוע השישי (לתצוגה) */
export function foundationEnd(start: ISODate): ISODate {
  return addDays(start, FOUNDATION_WEEKS * 7 - 1);
}

/** R-BEG-2: תוכנית יסודות ראשונה מתחילה מהיום. אם כבר הייתה, מיום ראשון הבא (R-VER-2) */
export function foundationStartDate(versions: WeekPlanVersion[], today: ISODate): ISODate | null {
  return versions.some((v) => !v.deletedAt && v.program === 'foundation') ? null : today;
}

/**
 * R-BEG-2: תרגילי ההתחלה בכל משפחת יסודות: הרמה הקלה ביותר בסולם,
 * וגם הרמה הקלה ביותר שזמינה בכל מיקום פעיל. משפחה שכבר מוכנה (🟢/🟡) לא משתנה
 */
export function foundationStartExercises(exercises: Exercise[], locations: LocationSetup[], injuries: Injury[] = []): { family: FamilyId; exercises: Exercise[]; ready: boolean }[] {
  return FOUNDATION_FAMILIES.map((family) => {
    const lad = ladder(exercises, family).filter((e) => !isBlocked(e, injuries));
    const ready = lad.filter((e) => e.status === 'green' || e.status === 'yellow');
    if (ready.length) return { family, exercises: [ready[ready.length - 1]], ready: true };
    if (!lad.length) return { family, exercises: [], ready: false };
    const lowest = (list: Exercise[]) => {
      const lvl = Math.min(...list.map((e) => levelIn(e, family) ?? 0));
      return list.filter((e) => levelIn(e, family) === lvl);
    };
    const picks = new Map(lowest(lad).map((e) => [e.id, e]));
    for (const loc of locations.filter((l) => l.enabled)) {
      const here = lad.filter((e) => availableAt(e, loc));
      if (here.length) for (const e of lowest(here)) picks.set(e.id, e);
    }
    return { family, exercises: [...picks.values()], ready: false };
  });
}

/** R-BEG-2: שינויי הסטטוס באישור "מתחילים היום" */
export function foundationStartChanges(exercises: Exercise[], locations: LocationSetup[], injuries: Injury[] = []): Record<string, 'yellow'> {
  const out: Record<string, 'yellow'> = {};
  for (const row of foundationStartExercises(exercises, locations, injuries)) {
    if (row.ready) continue;
    for (const e of row.exercises) if (e.status === 'red') out[e.id] = 'yellow';
  }
  return out;
}

/**
 * R-BEG-7: כיול באימון הראשון. סט עבודה מעל הקצה העליון עם RPE עד 8 ← מעבר מיידי לרמה הבאה.
 * sessionsAll = כל האימונים עם התרגיל. רק כשיש בדיוק אימון רגיל אחד
 */
export function calibrationSuggestion(ex: Exercise, family: string, sessionsAll: PastExercise[], next: { ex: Exercise; availableSomewhere: boolean }[]): ProgressionSuggestion | null {
  const sessions = sessionsAll.filter((s) => s.kind === 'regular' && !s.isDeload && s.role === 'work');
  if (sessions.length !== 1 || ex.status === null) return null;
  const vals = setValues(sessions[0].sets, ex.measure, ex.unilateral);
  const over = vals.filter((v) => v.value > ex.targetMax && (v.rpe ?? 8) <= 8);
  if (!over.length) return null;
  const nx = next.find((x) => x.availableSomewhere)?.ex;
  if (!nx) return null;
  const best = Math.max(...over.map((v) => v.value));
  return {
    type: 'advance',
    title: `לעבור ל-${nx.name}`,
    reason: `באימון הראשון ב-${ex.name} בוצעו ${best}${ex.measure === 'time' ? ' שניות' : ''}, מעל הקצה העליון (${ex.targetMax}). כנראה קל מדי, אז עולים רמה כבר עכשיו (R-BEG-7)`,
    payload: { exerciseId: ex.id, nextId: nx.id, family }
  };
}
