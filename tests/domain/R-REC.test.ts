import { describe, expect, it } from 'vitest';
import { isLowRecovery, recoveryScore, sleepScore } from '../../src/domain/rules/R-REC';

describe('✅ בדיקת קבלה: ציון ההתאוששות תואם את הנוסחה (R-REC-1)', () => {
  it('ציון שינה', () => {
    expect(sleepScore(8)).toBe(10);
    expect(sleepScore(7)).toBe(10);
    expect(sleepScore(9)).toBe(10);
    expect(sleepScore(9.5)).toBe(9);
    expect(sleepScore(6)).toBe(8);
    expect(sleepScore(6.5)).toBe(9);
    expect(sleepScore(5)).toBe(6);
    expect(sleepScore(1)).toBe(1);
  });
  it('ממוצע של מה שקיים', () => {
    // שינה 6 = 8, איכות 7, אנרגיה 6, DOMS 3 → 8. ממוצע = 29/4 = 7.25 → 7.3
    expect(recoveryScore({ sleepHours: 6, sleepQuality: 7, energy: 6, doms: 3 }).score).toBe(7.3);
    expect(recoveryScore({ energy: 5 }).score).toBe(5);
    expect(recoveryScore({ doms: 10 }).score).toBe(1);
  });
  it('בלי נתונים: אין ציון', () => {
    expect(recoveryScore({}).score).toBeNull();
  });
  it('ידני דורס ומסומן', () => {
    const r = recoveryScore({ sleepHours: 8, energy: 9, manualRecovery: 3 });
    expect(r).toMatchObject({ score: 3, manual: true });
  });
  it('R-REC-2: מתחת ל-4', () => {
    expect(isLowRecovery(3.9)).toBe(true);
    expect(isLowRecovery(4)).toBe(false);
    expect(isLowRecovery(null)).toBe(false);
  });
});
