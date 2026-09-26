import { describe, expect, it } from 'vitest';
import { activePhase, phaseEditMode, validateEndDate, validatePhase } from '../../src/domain/rules/phase';
import { ph } from './helpers';

const today = '2026-09-27';
const input = (startDate: string, endDate: string | null = null) => ({ type: 'cut' as const, startDate, endDate, calories: 2000, weeklyRateKg: -0.5 });

describe('שלבים (4.1)', () => {
  it('תאריך התחלה בעבר נדחה', () => {
    expect(validatePhase([], input('2026-09-26'), today).errors).toHaveLength(1);
    expect(validatePhase([], input(today), today).errors).toHaveLength(0);
  });
  it('שלב פתוח קודם נסגר יום לפני השלב החדש', () => {
    const v = validatePhase([ph('old', '2026-09-01', null)], input('2026-10-01'), today);
    expect(v.errors).toEqual([]);
    expect(v.closes).toEqual({ id: 'old', endDate: '2026-09-30' });
  });
  it('חפיפה עם שלב עתידי נדחית', () => {
    const v = validatePhase([ph('fut', '2026-10-10', null)], input('2026-10-01'), today);
    expect(v.errors.length).toBeGreaterThan(0);
  });
  it('שלב עם סוף לפני העתידי מותר', () => {
    const v = validatePhase([ph('fut', '2026-10-10', null)], input('2026-10-01', '2026-10-09'), today);
    expect(v.errors).toEqual([]);
  });
  it('מה מותר לערוך', () => {
    expect(phaseEditMode(ph('a', '2026-10-01', null), today)).toBe('full');
    expect(phaseEditMode(ph('a', today, null), today)).toBe('full');
    expect(phaseEditMode(ph('a', '2026-09-01', null), today)).toBe('endDateOnly');
    expect(phaseEditMode(ph('a', '2026-09-01', '2026-09-26'), today)).toBe('none');
  });
  it('תאריך סיום לשלב פעיל: לא בעבר', () => {
    const p = ph('a', '2026-09-01', null);
    expect(validateEndDate(p, '2026-09-26', today, [p])).toHaveLength(1);
    expect(validateEndDate(p, today, today, [p])).toHaveLength(0);
  });
  it('השלב הפעיל בתאריך', () => {
    const list = [ph('a', '2026-09-01', '2026-09-30'), ph('b', '2026-10-01', null)];
    expect(activePhase(list, '2026-09-30')?.id).toBe('a');
    expect(activePhase(list, '2026-10-01')?.id).toBe('b');
    expect(activePhase(list, '2026-08-01')).toBeNull();
  });
});
