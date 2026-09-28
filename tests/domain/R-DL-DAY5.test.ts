import { describe, expect, it } from 'vitest';
import { canPostpone, earlyDeloadReasons, isDeloadWeek, programWeek, type DeloadContext } from '../../src/domain/rules/R-DL';
import { DEFAULT_WEEK_DAYS, findMissed, weekSchedule } from '../../src/domain/rules/R-DAY';
import { dayOfWeek } from '../../src/domain/calc/dates';
import { weeklyVolume, volumeOutOfRange } from '../../src/domain/engine/volume';
import { exercisesWith, session } from './engine-helpers';

const ctx = (p: Partial<DeloadContext> = {}): DeloadContext => ({ programStart: '2026-09-27', every: 5, earlyWeeks: [], postponedWeeks: [], ...p });

describe('R-DL שבוע הורדת עומס', () => {
  it('כל שבוע חמישי מתחילת התוכנית', () => {
    expect(programWeek('2026-10-01', '2026-09-27')).toBe(1);
    expect(isDeloadWeek('2026-10-24', ctx())).toBe(false); // שבוע 5 מתחיל ב-25.10
    expect(isDeloadWeek('2026-10-25', ctx())).toBe(true);
    expect(isDeloadWeek('2026-10-26', ctx())).toBe(true);
    expect(isDeloadWeek('2026-11-02', ctx())).toBe(false);
    expect(isDeloadWeek('2026-10-26', ctx({ every: 4 }))).toBe(false);
  });
  it('R-DL-3: דחייה בשבוע אחד, פעם אחת', () => {
    const c = ctx({ postponedWeeks: ['2026-10-25'] });
    expect(isDeloadWeek('2026-10-26', c)).toBe(false);
    expect(isDeloadWeek('2026-11-02', c)).toBe(true);
    expect(canPostpone('2026-10-26', ctx())).toBe(true);
    expect(canPostpone('2026-10-26', c)).toBe(false);
  });
  it('R-DL-1: הורדה מוקדמת', () => {
    expect(isDeloadWeek('2026-10-06', ctx({ earlyWeeks: ['2026-10-04'] }))).toBe(true);
    expect(earlyDeloadReasons({ avgRpe: 9.1, avgRecovery: 6, missedExercises: 0 })).toHaveLength(1);
    expect(earlyDeloadReasons({ avgRpe: 8, avgRecovery: 4.5, missedExercises: 3 })).toHaveLength(2);
    expect(earlyDeloadReasons({ avgRpe: null, avgRecovery: null, missedExercises: 0 })).toEqual([]);
  });
  it('בלי אימון רגיל עדיין: אין הורדת עומס', () => {
    expect(isDeloadWeek('2026-10-26', ctx({ programStart: null }))).toBe(false);
  });
});

describe('R-DAY-5 אימון שהוחמץ', () => {
  const base = (d: string) => DEFAULT_WEEK_DAYS[dayOfWeek(d)];
  it('בלי החלטות: התוכנית הרגילה', () => {
    const s = weekSchedule('2026-10-04', base, []);
    expect(s.get('2026-10-05')!.templateId).toBe('tpl-pull');
  });
  it('"בצע את מה שהוחמץ": היום מקבל את שהוחמץ, והבאות נדחות עד סוף השבוע', () => {
    // ראשון (דחיקה) הוחמץ, ההחלטה בשני
    const s = weekSchedule('2026-10-04', base, [{ decidedOn: '2026-10-05', templateId: 'tpl-push' }]);
    expect(s.get('2026-10-05')!.templateId).toBe('tpl-push');
    expect(s.get('2026-10-06')!.templateId).toBe('tpl-pull');
    expect(s.get('2026-10-07')!.dayType).toBe('activeRecovery'); // רביעי לא מוחלף
    expect(s.get('2026-10-08')!.templateId).toBe('tpl-legs-core');
    expect(s.get('2026-10-09')!.templateId).toBe('tpl-upper');
    expect(s.get('2026-10-10')!.dayType).toBe('rest'); // שבת לא מוחלפת
    // בשבוע הבא חוזרים לרגיל
    expect(weekSchedule('2026-10-11', base, [{ decidedOn: '2026-10-05', templateId: 'tpl-push' }]).get('2026-10-11')!.templateId).toBe('tpl-push');
  });
  it('זיהוי יום שהוחמץ, רק ביום אימון', () => {
    const s = weekSchedule('2026-10-04', base, []);
    expect(findMissed('2026-10-05', s, new Set(), new Set())).toEqual({ date: '2026-10-04', templateId: 'tpl-push' });
    expect(findMissed('2026-10-05', s, new Set(['2026-10-04']), new Set())).toBeNull();
    expect(findMissed('2026-10-05', s, new Set(), new Set(['2026-10-04']))).toBeNull();
    expect(findMissed('2026-10-07', s, new Set(), new Set())).toBeNull(); // רביעי אינו יום אימון
  });
});

describe('R-GEN-3 נפח שבועי', () => {
  const exs = new Map(exercisesWith(3).map((e) => [e.id, e]));
  it('ראשי 1, משני 0.5', () => {
    const v = weeklyVolume([session('ex-push-up', '2026-10-05', [10, 10, 10])], exs, '2026-10-04');
    expect(v.chest).toBe(3);
    expect(v.shoulders).toBe(1.5);
    expect(v.triceps).toBe(1.5);
  });
  it('מחוץ לטווח שבועיים ברציפות', () => {
    const h = [session('ex-push-up', '2026-09-28', [10, 10, 10]), session('ex-push-up', '2026-10-05', [10, 10, 10])];
    const out = volumeOutOfRange(h, exs, '2026-10-12');
    expect(out.find((o) => o.muscle === 'chest')).toMatchObject({ direction: 'add', values: [3, 3] });
  });
});
