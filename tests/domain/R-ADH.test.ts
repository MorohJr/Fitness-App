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
