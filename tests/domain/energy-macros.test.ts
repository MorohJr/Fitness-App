import { describe, expect, it } from 'vitest';
import { bmr, suggestCalories } from '../../src/domain/calc/energy';
import { macrosFor } from '../../src/domain/calc/macros';

describe('R-NUT-1 מחשבון', () => {
  it('BMR לפי Mifflin-St Jeor', () => {
    expect(bmr('male', 80, 180, 30)).toBe(1780);
    expect(bmr('female', 80, 180, 30)).toBe(1614);
  });
  it('מקדם פעילות והתאמת שלב ברירת מחדל (חיטוב ‎−15%)', () => {
    const r = suggestCalories({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, activityLevel: 'moderate', phaseType: 'cut' });
    expect(r.tdee).toBe(2848);
    expect(r.adjustPct).toBe(-15);
    expect(r.calories).toBe(2420);
  });
  it('ברירות מחדל לשאר השלבים', () => {
    const base = { sex: 'male', weightKg: 80, heightCm: 180, age: 30, activityLevel: 'sedentary' } as const;
    expect(suggestCalories({ ...base, phaseType: 'bulk' }).adjustPct).toBe(5);
    expect(suggestCalories({ ...base, phaseType: 'recomp' }).adjustPct).toBe(-5);
    expect(suggestCalories({ ...base, phaseType: 'maintain' }).calories).toBe(Math.round((1780 * 1.4) / 10) * 10);
  });
  it('התאמה מחוץ לטווח נדחית', () => {
    expect(() => suggestCalories({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, activityLevel: 'high', phaseType: 'cut', adjustPct: -25 })).toThrow();
    expect(suggestCalories({ sex: 'male', weightKg: 80, heightCm: 180, age: 30, activityLevel: 'high', phaseType: 'cut', adjustPct: -20 }).adjustPct).toBe(-20);
  });
});

describe('R-NUT-2 מאקרו', () => {
  it('חלבון ושומן לפי ק"ג, פחמימות השארית', () => {
    expect(macrosFor(2400, 80, 1.8, 0.8)).toEqual({ proteinG: 144, fatG: 64, carbsG: 312, carbsClamped: false });
  });
  it('פחמימות לא יורדות מתחת ל-0', () => {
    const m = macrosFor(800, 100, 2.2, 0.8);
    expect(m.carbsG).toBe(0);
    expect(m.carbsClamped).toBe(true);
  });
});
