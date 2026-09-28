// R-DL: שבוע הורדת עומס
import type { ISODate } from '../types';
import { addDays, daysBetween, startOfWeek } from '../calc/dates';

export interface DeloadContext {
  /** יום ראשון של השבוע עם האימון הרגיל הראשון (R-DL-1) */
  programStart: ISODate | null;
  every: number;
  /** שבועות שאושרו כהורדת עומס מוקדמת */
  earlyWeeks: ISODate[];
  /** שבועות מתוכננים שנדחו בשבוע (R-DL-3) */
  postponedWeeks: ISODate[];
}

/** מספר השבוע בתוכנית (1 = השבוע הראשון) */
export function programWeek(date: ISODate, programStart: ISODate): number {
  return Math.floor(daysBetween(programStart, startOfWeek(date)) / 7) + 1;
}

export function isScheduledDeload(weekStart: ISODate, ctx: DeloadContext): boolean {
  if (!ctx.programStart || weekStart < ctx.programStart) return false;
  return programWeek(weekStart, ctx.programStart) % ctx.every === 0;
}

/** R-DL-1 + R-DL-3: האם השבוע של התאריך הוא שבוע הורדת עומס */
export function isDeloadWeek(date: ISODate, ctx: DeloadContext): boolean {
  const w = startOfWeek(date);
  if (ctx.earlyWeeks.includes(w)) return true;
  if (isScheduledDeload(w, ctx) && !ctx.postponedWeeks.includes(w)) return true;
  // שבוע שנדחה עובר לשבוע שאחריו
  const prev = addDays(w, -7);
  return ctx.postponedWeeks.includes(prev) && isScheduledDeload(prev, ctx);
}

/** אפשר לדחות פעם אחת: שבוע מתוכנן שעוד לא נדחה */
export function canPostpone(date: ISODate, ctx: DeloadContext): boolean {
  const w = startOfWeek(date);
  return isScheduledDeload(w, ctx) && !ctx.postponedWeeks.includes(w) && !ctx.earlyWeeks.includes(w);
}

export interface WeekStats {
  avgRpe: number | null;
  avgRecovery: number | null;
  missedExercises: number;
}

/** R-DL-1: סיבות להצעה מוקדמת */
export function earlyDeloadReasons(s: WeekStats): string[] {
  const r: string[] = [];
  if (s.avgRpe !== null && s.avgRpe >= 9) r.push(`RPE ממוצע ${s.avgRpe} בסטי העבודה`);
  if (s.avgRecovery !== null && s.avgRecovery < 5) r.push(`ציון התאוששות ממוצע ${s.avgRecovery}`);
  if (s.missedExercises >= 3) r.push(`היעד לא הושג ב-${s.missedExercises} תרגילים`);
  return r;
}

/** R-DL-2: חצי מהסטים, מעוגל למעלה */
export const deloadSets = (sets: number) => Math.ceil(sets / 2);
