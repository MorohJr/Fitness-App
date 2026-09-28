// R-NUT-3: התאמה חכמה (כל 14 יום, הצעה בלבד)
import type { ISODate, WeighIn } from '../types';
import { addDays } from '../calc/dates';
import { trendWeight } from '../calc/weight';

export const ADJUST_WINDOW = 14;
export const KCAL_PER_KG = 7700;

export interface AdjustInput {
  today: ISODate;
  /** קלוריות שנאכלו בימים עם "רישום מלא" */
  completeDays: { date: ISODate; kcal: number }[];
  weighIns: WeighIn[];
  currentCalories: number;
  /** מהשלב הפעיל, או 0 בלי שלב */
  weeklyRateKg: number;
}

export type AdjustResult =
  | { eligible: false; reason: string }
  | { eligible: true; avgIntake: number; trendChangeKgPerDay: number; tdee: number; suggested: number; diff: number; worthIt: boolean };

export function smartAdjustment(i: AdjustInput): AdjustResult {
  const end = addDays(i.today, -1);
  const start = addDays(i.today, -ADJUST_WINDOW);
  const days = i.completeDays.filter((d) => d.date >= start && d.date <= end);
  const weigh = i.weighIns.filter((w) => w.date >= start && w.date <= end);
  const weighDays = new Set(weigh.map((w) => w.date)).size;
  if (days.length < 10) return { eligible: false, reason: `צריך לפחות 10 ימים עם רישום תזונה מלא ב-14 הימים האחרונים (יש ${days.length})` };
  if (weighDays < 8) return { eligible: false, reason: `צריך לפחות 8 שקילות בוקר ב-14 הימים האחרונים (יש ${weighDays})` };
  const tEnd = trendWeight(weigh, end);
  const tStart = trendWeight(weigh, addDays(start, 6));
  if (tEnd === null || tStart === null) return { eligible: false, reason: 'אין מספיק שקילות כדי לחשב מגמה בתחילת ובסוף התקופה' };
  const perDay = (tEnd - tStart) / 7;
  const avgIntake = days.reduce((a, d) => a + d.kcal, 0) / days.length;
  const tdee = avgIntake - perDay * KCAL_PER_KG;
  const suggested = Math.round((tdee + (i.weeklyRateKg * KCAL_PER_KG) / 7) / 10) * 10;
  const diff = suggested - i.currentCalories;
  return { eligible: true, avgIntake: Math.round(avgIntake), trendChangeKgPerDay: Math.round(perDay * 1000) / 1000, tdee: Math.round(tdee), suggested, diff, worthIt: Math.abs(diff) >= 100 };
}

/** האם הגיע הזמן לבדוק: 14 יום מההצעה האחרונה, או מהיום הראשון עם רישום */
export function adjustmentDue(today: ISODate, lastCheck: ISODate | null): boolean {
  if (!lastCheck) return false;
  return addDays(lastCheck, ADJUST_WINDOW) <= today;
}
