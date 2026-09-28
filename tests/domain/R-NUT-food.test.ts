import { describe, expect, it } from 'vitest';
import { autoShoppingList, mealAvailability, mealTotals, sumLogs } from '../../src/domain/rules/R-NUT-food';
import { smartAdjustment, adjustmentDue } from '../../src/domain/rules/R-NUT-adjust';
import { phaseCaloriesOn } from '../../src/domain/rules/phase';
import type { Meal, PantryItem } from '../../src/domain/types';
import { ph } from './helpers';

const base = { createdAt: '', updatedAt: '', deletedAt: null };
const item = (id: string, stock: PantryItem['stock'], kcal: number, protein: number, carbs = 0, fat = 0): PantryItem => ({
  ...base, id, name: id, category: 'protein', stock, per100: { kcal, protein, carbs, fat }, barcode: null, source: 'manual'
});
const pantry = [item('chicken', 'in', 165, 31, 0, 3.6), item('rice', 'low', 130, 2.7, 28, 0.3), item('oil', 'out', 884, 0, 0, 100)];
const map = new Map(pantry.map((p) => [p.id, p]));
const meal = (ings: [string, number][], inWeeklyMenu = false): Meal => ({ ...base, id: 'm', name: 'ארוחה', type: 'lunch', photoId: null, instructions: '', ingredients: ings.map(([pantryItemId, grams]) => ({ pantryItemId, grams })), inWeeklyMenu });

describe('R-NUT-5 ערכי ארוחה וזמינות', () => {
  it('סכום לפי גרמים', () => {
    expect(mealTotals(meal([['chicken', 200], ['rice', 150]]), map)).toEqual({ kcal: 330 + 195, protein: 62 + 4.1, carbs: 42, fat: 7.7 });
  });
  it('זמינה אם הכול במלאי או נמוך, אחרת מראה מה חסר', () => {
    expect(mealAvailability(meal([['chicken', 100], ['rice', 100]]), map).available).toBe(true);
    const a = mealAvailability(meal([['chicken', 100], ['oil', 10]]), map);
    expect(a.available).toBe(false);
    expect(a.missing.map((m) => m.id)).toEqual(['oil']);
  });
  it('סכום רישומים', () => {
    expect(sumLogs([{ kcal: 100, protein: 10, carbs: 5, fat: 2 }, { kcal: 50, protein: 1.5, carbs: 0, fat: 0 }])).toEqual({ kcal: 150, protein: 11.5, carbs: 5, fat: 2 });
  });
});

describe('R-NUT-6 רשימת קניות אוטומטית', () => {
  it('אזל, נמוך, וחסרים לארוחות בתפריט השבוע', () => {
    const extra = item('eggs', 'out', 155, 13);
    const list = autoShoppingList([...pantry, extra], [meal([['chicken', 100]], true)]);
    expect(list.map((l) => l.key).sort()).toEqual(['eggs', 'oil', 'rice']);
  });
  it('ארוחה שלא בתפריט לא מוסיפה', () => {
    const list = autoShoppingList([item('a', 'in', 1, 1)], [meal([['a', 1]], false)]);
    expect(list).toEqual([]);
  });
});

describe('R-NUT-3 התאמה חכמה', () => {
  const today = '2026-10-15';
  const days = (n: number, kcal: number) => Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, kcal }));
  const weighIns = (from: number, to: number, start: number, perDay: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => ({ date: `2026-10-${String(from + i).padStart(2, '0')}`, weightKg: Math.round((start + perDay * i) * 100) / 100 }));
  it('דורש 10 ימים מלאים ו-8 שקילות', () => {
    expect(smartAdjustment({ today, completeDays: days(9, 2000), weighIns: weighIns(1, 14, 80, 0), currentCalories: 2000, weeklyRateKg: 0 }).eligible).toBe(false);
    expect(smartAdjustment({ today, completeDays: days(12, 2000), weighIns: weighIns(1, 7, 80, 0), currentCalories: 2000, weeklyRateKg: 0 }).eligible).toBe(false);
  });
  it('משקל יציב: הוצאה = צריכה', () => {
    const r = smartAdjustment({ today, completeDays: days(12, 2500), weighIns: weighIns(1, 14, 80, 0), currentCalories: 2200, weeklyRateKg: 0 });
    expect(r).toMatchObject({ eligible: true, tdee: 2500, suggested: 2500, diff: 300, worthIt: true });
  });
  it('ירידה של 0.1 ק"ג ליום: הוצאה = צריכה + 770; חיטוב 0.5 לשבוע', () => {
    const r = smartAdjustment({ today, completeDays: days(12, 2000), weighIns: weighIns(1, 14, 80, -0.1), currentCalories: 2200, weeklyRateKg: -0.5 });
    if (!r.eligible) throw new Error(r.reason);
    expect(r.tdee).toBe(2770);
    expect(r.suggested).toBe(Math.round((2770 - 550) / 10) * 10);
  });
  it('הפרש קטן מ-100: לא מציעים', () => {
    const r = smartAdjustment({ today, completeDays: days(12, 2250), weighIns: weighIns(1, 14, 80, 0), currentCalories: 2200, weeklyRateKg: 0 });
    expect(r.eligible && r.worthIt).toBe(false);
  });
  it('מתי לבדוק', () => {
    expect(adjustmentDue('2026-10-15', '2026-10-01')).toBe(true);
    expect(adjustmentDue('2026-10-14', '2026-10-01')).toBe(false);
    expect(adjustmentDue('2026-10-14', null)).toBe(false);
  });
});

describe('שינויי יעד בתוך שלב (4.1)', () => {
  it('היעד של יום = השינוי האחרון עד אותו יום', () => {
    const p = { ...ph('p', '2026-09-01', null, 2000), calorieChanges: [{ from: '2026-09-15', calories: 1900 }, { from: '2026-10-01', calories: 1800 }] };
    expect(phaseCaloriesOn(p, '2026-09-10')).toBe(2000);
    expect(phaseCaloriesOn(p, '2026-09-20')).toBe(1900);
    expect(phaseCaloriesOn(p, '2026-10-05')).toBe(1800);
  });
});
