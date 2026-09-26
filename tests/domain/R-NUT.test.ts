import { describe, expect, it } from 'vitest';
import { computeDayTargets } from '../../src/domain/rules/R-NUT';
import { ph, tv } from './helpers';

describe('R-NUT-4 יעדי יום', () => {
  it('בלי שלב: קלוריות מגרסת היעדים, מאקרו לפי משקל הייחוס', () => {
    const t = computeDayTargets({ date: '2026-09-27', targetVersions: [tv('a', '2026-09-01', 2400)], phases: [], weighIns: [], manualWeightKg: 80 });
    expect(t).toMatchObject({ calories: 2400, calorieSource: 'targets', proteinG: 144, fatG: 64, carbsG: 312, waterL: 3, steps: 8000, referenceWeightKg: 80 });
  });
  it('שלב פעיל קובע את הקלוריות', () => {
    const t = computeDayTargets({ date: '2026-09-27', targetVersions: [tv('a', '2026-09-01', 2400)], phases: [ph('p', '2026-09-20', null, 2000)], weighIns: [], manualWeightKg: 80 });
    expect(t.calories).toBe(2000);
    expect(t.calorieSource).toBe('phase');
    expect(t.carbsG).toBe(Math.round((2000 - 144 * 4 - 64 * 9) / 4));
  });
  it('שלב שהסתיים לא משפיע', () => {
    const t = computeDayTargets({ date: '2026-09-27', targetVersions: [tv('a', '2026-09-01', 2400)], phases: [ph('p', '2026-09-01', '2026-09-26', 2000)], weighIns: [], manualWeightKg: 80 });
    expect(t.calories).toBe(2400);
  });
  it('בלי משקל: אין מאקרו, אבל יש קלוריות', () => {
    const t = computeDayTargets({ date: '2026-09-27', targetVersions: [tv('a', '2026-09-01', 2400)], phases: [], weighIns: [], manualWeightKg: null });
    expect(t.calories).toBe(2400);
    expect(t.proteinG).toBeNull();
  });
  it('יום לפני כל גרסה: אין יעדים', () => {
    const t = computeDayTargets({ date: '2026-08-01', targetVersions: [tv('a', '2026-09-01', 2400)], phases: [], weighIns: [], manualWeightKg: 80 });
    expect(t.calories).toBeNull();
  });
});
