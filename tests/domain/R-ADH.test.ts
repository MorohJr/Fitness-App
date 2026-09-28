import { describe, expect, it } from 'vitest';
import { nutritionMet } from '../../src/domain/rules/R-ADH';

const t = { calories: 2000, proteinG: 150, adherence: { caloriesPct: 10, proteinMinPct: 90 } };
describe('R-ADH-1 עמידה ביעד תזונה', () => {
  it('בטווח ±10% וחלבון ≥90%', () => {
    expect(nutritionMet({ kcal: 2200, protein: 135 }, t)).toBe(true);
    expect(nutritionMet({ kcal: 1800, protein: 150 }, t)).toBe(true);
    expect(nutritionMet({ kcal: 2201, protein: 150 }, t)).toBe(false);
    expect(nutritionMet({ kcal: 2000, protein: 134 }, t)).toBe(false);
  });
  it('בלי יעד: אין ציון', () => {
    expect(nutritionMet({ kcal: 1, protein: 1 }, { calories: null, proteinG: null, adherence: null })).toBeNull();
  });
});

import { adherencePct, streak, trainingMet, type DayCheck } from '../../src/domain/rules/R-ADH';
import { addDays, dayOfWeek } from '../../src/domain/calc/dates';

const mk = (date: string, p: Partial<DayCheck> = {}): DayCheck => ({ date, dayType: dayOfWeek(date) === 6 ? 'rest' : 'training', hasLog: true, nutrition: true, training: dayOfWeek(date) === 6 ? null : true, ...p });
const range = (from: string, n: number, p: (d: string) => Partial<DayCheck> = () => ({})) => new Map(Array.from({ length: n }, (_, i) => addDays(from, i)).map((d) => [d, mk(d, p(d))]));

describe('R-ADH-2 עמידה ביעד אימון', () => {
  it('לפי סוג היום', () => {
    expect(trainingMet('training', ['training'])).toBe(true);
    expect(trainingMet('training', [])).toBe(false);
    expect(trainingMet('activeRecovery', ['activeRecovery'])).toBe(true);
    expect(trainingMet('rest', [])).toBeNull();
  });
});

describe('R-ADH-3/4 רצף 🔥', () => {
  it('שבת לא נספרת ולא שוברת', () => {
    // 27.09 (ראשון) עד 05.10 (שני), כולל שבת 03.10 בלי כלום
    const c = range('2026-09-27', 9, (d) => (d === '2026-10-03' ? { hasLog: false, nutrition: null } : {}));
    expect(streak(c, '2026-10-05')).toBe(8);
  });
  it('יום שנכשל שובר', () => {
    const c = range('2026-09-27', 9, (d) => (d === '2026-10-01' ? { nutrition: false } : {}));
    expect(streak(c, '2026-10-05')).toBe(3); // 02, 04, 05 (03 שבת)
  });
  it('היום הנוכחי לא שובר עד שהוא נסגר', () => {
    const c = range('2026-09-27', 9, (d) => (d === '2026-10-05' ? { nutrition: false, training: false } : {}));
    expect(streak(c, '2026-10-05')).toBe(7);
  });
  it('יום אימון בלי אימון שובר', () => {
    const c = range('2026-10-04', 2, (d) => (d === '2026-10-04' ? { training: false } : {}));
    expect(streak(c, '2026-10-06')).toBe(1);
  });
});

describe('R-ADH-5 אחוז עמידה', () => {
  it('7 ימים אחרונים שנסגרו, בלי שבת', () => {
    const c = range('2026-09-27', 9, (d) => (d === '2026-10-01' ? { nutrition: false } : {}));
    const r = adherencePct(c, '2026-10-05', 7); // 28.09–04.10, בלי 03.10 = 6 ימים × 2
    expect(r).toEqual({ achieved: 11, possible: 12, pct: 92 });
  });
  it('ימים בלי רישום נספרים כאפשריים', () => {
    const r = adherencePct(new Map(), '2026-10-05', 7);
    expect(r).toEqual({ achieved: 0, possible: 6, pct: 0 });
  });
  it('ימים לפני תחילת השימוש לא נספרים', () => {
    expect(adherencePct(new Map(), '2026-10-05', 7, '2026-10-05')).toEqual({ achieved: 0, possible: 0, pct: null });
    expect(adherencePct(new Map(), '2026-10-05', 7, '2026-10-04').possible).toBe(1);
  });
});
