import { describe, expect, it } from 'vitest';
import { addDays, ageOn, dayOfWeek, isValidDate, logicalDate, nextSunday, startOfWeek } from '../../src/domain/calc/dates';

describe('תאריך לוגי (יום מתחיל ב-04:00)', () => {
  it('00:30 שייך ליום הקודם', () => {
    expect(logicalDate(new Date(2026, 8, 28, 0, 30))).toBe('2026-09-27');
  });
  it('03:59 עדיין היום הקודם, 04:00 כבר היום החדש', () => {
    expect(logicalDate(new Date(2026, 8, 28, 3, 59))).toBe('2026-09-27');
    expect(logicalDate(new Date(2026, 8, 28, 4, 0))).toBe('2026-09-28');
  });
  it('מעבר חודש ושנה', () => {
    expect(logicalDate(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });
});

describe('חשבון תאריכים', () => {
  it('addDays ומעבר חודש', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('ראשון = 0, שבת = 6', () => {
    expect(dayOfWeek('2026-09-27')).toBe(0);
    expect(dayOfWeek('2026-10-03')).toBe(6);
  });
  it('תחילת שבוע וראשון הבא', () => {
    expect(startOfWeek('2026-10-01')).toBe('2026-09-27');
    expect(nextSunday('2026-10-01')).toBe('2026-10-04');
    expect(nextSunday('2026-09-27')).toBe('2026-10-04');
  });
  it('גיל לפי יום הולדת', () => {
    expect(ageOn('1990-09-28', '2026-09-27')).toBe(35);
    expect(ageOn('1990-09-27', '2026-09-27')).toBe(36);
  });
  it('בדיקת תקינות תאריך', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
    expect(isValidDate('2028-02-29')).toBe(true);
  });
});
