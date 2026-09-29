// R-RANK: דרגה ודמות. תצוגה בלבד (⚙️), מחושב מהנתונים ולא נשמר (E2)
import type { Exercise, ISODate, Sex } from '../types';
import type { PastExercise } from '../engine/history';
import type { FamilyId } from '../families';
import { ladder, levelIn } from '../calc/exercises';

/** R-RANK-2: 7 משפחות המפתח */
export const RANK_FAMILIES: FamilyId[] = ['horizontalPush', 'verticalPush', 'verticalPull', 'horizontalPull', 'squat', 'singleLeg', 'hipHinge'];

/** R-RANK-3: שמות הדרגות (אינדקס = דרגה) */
export const RANK_NAMES = ['', 'מתחיל', 'בתנועה', 'מתחזק', 'חטוב', 'אתלט'];

/** R-RANK-1: גבולות תחתונים של ציונים 1–4 (אחוז שומן) */
const BF_BANDS: Record<Sex, [number, number, number, number]> = { male: [30, 25, 20, 15], female: [38, 33, 28, 23] };
/** R-RANK-2: גבולות של ממוצע הרמות לציונים 2–5 */
const STRENGTH_BANDS = [0.2, 0.4, 0.6, 0.8];

const r1 = (x: number) => Math.round(x * 10) / 10;

/** R-RANK-1: ציון גוף 1–5 לפי אחוז שומן */
export function bodyScore(bodyFat: number | null, sex: Sex | null): number | null {
  if (bodyFat === null || !sex) return null;
  const [a, b, c, d] = BF_BANDS[sex];
  return bodyFat >= a ? 1 : bodyFat >= b ? 2 : bodyFat >= c ? 3 : bodyFat >= d ? 4 : 5;
}

/** R-RANK-1: הערכת אחוז שומן לפי BMI (Deurenberg), כשאין מדידה */
export function estimateBodyFat(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  return r1(1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4);
}

/** R-RANK-5: כמה אחוזי שומן עד ציון הגוף הבא (null בציון 5) */
export function bodyFatToNext(bodyFat: number, sex: Sex): number | null {
  const bands = BF_BANDS[sex];
  const next = bands.find((t) => bodyFat >= t);
  return next === undefined ? null : r1(bodyFat - next + 0.1);
}

/** הרמה הגבוהה בכל סולם (לנרמול) */
export function maxLevels(exercises: Exercise[]): Record<string, number> {
  return Object.fromEntries(
    RANK_FAMILIES.map((f) => [f, Math.max(0, ...ladder(exercises, f).map((e) => levelIn(e, f) ?? 0))])
  );
}

/**
 * R-RANK-2: הרמה הגבוהה שבוצע בה סט עבודה עד התאריך, לכל משפחת מפתח.
 * באימון רגיל: כל סט עבודה. במבחן: רק תוצאה 🟡/🟢. משפחה בלי ביצוע: לא מופיעה
 */
export function levelsReached(history: PastExercise[], date: ISODate): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of history) {
    if (h.date > date || h.role !== 'work' || !RANK_FAMILIES.includes(h.family as FamilyId)) continue;
    if (h.kind === 'test' && h.statusAtTime === 'red') continue;
    out[h.family] = Math.max(out[h.family] ?? 0, h.level);
  }
  return out;
}

/** ממוצע (רמה ÷ רמה מקסימלית) על 7 המשפחות. משפחה בלי ביצוע = 0 */
export function strengthRatio(levels: Record<string, number>, max: Record<string, number>): number {
  const parts = RANK_FAMILIES.map((f) => (max[f] ? Math.min(1, (levels[f] ?? 0) / max[f]) : 0));
  return parts.reduce((a, b) => a + b, 0) / RANK_FAMILIES.length;
}

export function strengthScore(ratio: number): number {
  return 1 + STRENGTH_BANDS.filter((t) => ratio >= t - 1e-9).length;
}

/** R-RANK-5: המינימום של עליות רמה עד ציון הכוח הבא. בכל פעם הרמה שתורמת הכי הרבה */
export function levelsToNext(levels: Record<string, number>, max: Record<string, number>): number | null {
  const score = strengthScore(strengthRatio(levels, max));
  if (score >= 5) return null;
  const goal = STRENGTH_BANDS[score - 1];
  const cur = { ...levels };
  let n = 0;
  while (strengthRatio(cur, max) < goal - 1e-9) {
    const options = RANK_FAMILIES.filter((f) => max[f] && (cur[f] ?? 0) < max[f]);
    if (!options.length) return null;
    // סולם קצר = כל רמה שווה יותר
    const best = options.sort((a, b) => max[a] - max[b])[0];
    cur[best] = (cur[best] ?? 0) + 1;
    n++;
  }
  return n;
}

export interface Rank {
  body: number | null;
  strength: number;
  /** null כשאין ציון גוף (אין מדידה עם אחוז שומן) */
  rank: number | null;
  name: string | null;
  bodyFat: number | null;
  /** אחוז השומן הוא הערכה לפי BMI, לא מדידה (R-RANK-1) */
  estimated: boolean;
  bodyFatToNext: number | null;
  levelsToNext: number | null;
}

/** R-RANK-3: דרגה = ממוצע הציונים, מעוגל למטה */
export function computeRank(bodyFat: number | null, sex: Sex | null, levels: Record<string, number>, max: Record<string, number>, estimated = false): Rank {
  const body = bodyScore(bodyFat, sex);
  const strength = strengthScore(strengthRatio(levels, max));
  const rank = body === null ? null : Math.floor((body + strength) / 2);
  return {
    body, strength, rank, name: rank === null ? null : RANK_NAMES[rank], bodyFat, estimated: estimated && bodyFat !== null,
    bodyFatToNext: bodyFat !== null && sex ? bodyFatToNext(bodyFat, sex) : null,
    levelsToNext: levelsToNext(levels, max)
  };
}
