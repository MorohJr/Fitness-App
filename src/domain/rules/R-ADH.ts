// R-ADH: עמידה ביעדים ורצף
import type { AdherenceRanges, DayTargets, Nutrients } from '../types';

/** R-ADH-1: קלוריות בטווח ±X% וגם חלבון לפחות Y% מיעד היום */
export function nutritionMet(eaten: Pick<Nutrients, 'kcal' | 'protein'>, t: Pick<DayTargets, 'calories' | 'proteinG' | 'adherence'>): boolean | null {
  if (t.calories === null || !t.adherence) return null;
  const a: AdherenceRanges = t.adherence;
  const kcalOk = Math.abs(eaten.kcal - t.calories) <= (t.calories * a.caloriesPct) / 100;
  const proteinOk = t.proteinG === null ? true : eaten.protein >= (t.proteinG * a.proteinMinPct) / 100;
  return kcalOk && proteinOk;
}

import type { DayType, ISODate } from '../types';
import { addDays, dayOfWeek } from '../calc/dates';

export interface DayCheck {
  date: ISODate;
  dayType: DayType;
  hasLog: boolean;
  /** R-ADH-1 (null = אין יעד) */
  nutrition: boolean | null;
  /** R-ADH-2 (null = יום מנוחה) */
  training: boolean | null;
}

/** R-ADH-2: ביום אימון אימון שהושלם; ביום התאוששות בלוק התאוששות שהושלם */
export function trainingMet(dayType: DayType, completedDayTypes: DayType[]): boolean | null {
  if (dayType === 'rest') return null;
  return completedDayTypes.includes(dayType);
}

const isSaturday = (d: ISODate) => dayOfWeek(d) === 6;

function dayOk(c: DayCheck): boolean {
  return c.hasLog && c.nutrition === true && (c.training === null || c.training === true);
}

/**
 * R-ADH-3/4: ימים ברצף עם DayLog, עמידה ביעד תזונה, וביום אימון/התאוששות גם באימון.
 * שבת לא נספרת ולא שוברת. היום הנוכחי לא שובר עד שהוא נסגר
 */
export function streak(checks: Map<ISODate, DayCheck>, today: ISODate): number {
  let n = 0;
  const t = checks.get(today);
  if (t && !isSaturday(today) && dayOk(t)) n++;
  for (let d = addDays(today, -1), guard = 0; guard < 3650; d = addDays(d, -1), guard++) {
    if (isSaturday(d)) continue;
    const c = checks.get(d);
    if (!c || !dayOk(c)) break;
    n++;
  }
  return n;
}

/** R-ADH-5: סימוני ✓ שהושגו ÷ אפשריים, ב-N הימים שנסגרו (בלי שבת, שבה הרישום אופציונלי). ימים לפני תחילת השימוש לא נספרים */
export function adherencePct(checks: Map<ISODate, DayCheck>, today: ISODate, days: number, since?: ISODate): { achieved: number; possible: number; pct: number | null } {
  let achieved = 0;
  let possible = 0;
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    if (isSaturday(d) || (since && d < since)) continue;
    const c = checks.get(d);
    if (!c) {
      possible += 1; // תזונה
      continue;
    }
    if (c.nutrition !== null || !c.hasLog) {
      possible++;
      if (c.nutrition) achieved++;
    }
    if (c.training !== null) {
      possible++;
      if (c.training) achieved++;
    }
  }
  return { achieved, possible, pct: possible ? Math.round((achieved / possible) * 100) : null };
}
