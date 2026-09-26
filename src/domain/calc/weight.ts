// משקל מגמה (R-BODY-3) ומשקל ייחוס (R-NUT-2)
import type { ISODate, WeighIn } from '../types';
import { addDays } from './dates';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** ממוצע שקילות ב-7 הימים שמסתיימים בתאריך, לפחות 3 שקילות. שקילה אחת ליום (האחרונה ברשימה) */
export function trendWeight(weighIns: WeighIn[], date: ISODate): number | null {
  const from = addDays(date, -6);
  const byDay = new Map<ISODate, number>();
  for (const w of weighIns) if (w.date >= from && w.date <= date) byDay.set(w.date, w.weightKg);
  if (byDay.size < 3) return null;
  const sum = [...byDay.values()].reduce((a, b) => a + b, 0);
  return round1(sum / byDay.size);
}

/** משקל הייחוס ליום: מגמה, אחרת השקילה האחרונה עד אותו יום, אחרת המשקל הידני */
export function referenceWeight(weighIns: WeighIn[], date: ISODate, manualWeightKg: number | null): number | null {
  const trend = trendWeight(weighIns, date);
  if (trend !== null) return trend;
  const past = weighIns.filter((w) => w.date <= date).sort((a, b) => a.date.localeCompare(b.date));
  if (past.length) return past[past.length - 1].weightKg;
  return manualWeightKg ?? null;
}
