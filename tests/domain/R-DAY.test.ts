import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES, DEFAULT_WEEK_DAYS, dayPlanForDate, validateWeekDays } from '../../src/domain/rules/R-DAY';

describe('R-DAY-1 תוכנית ברירת מחדל', () => {
  it('ראשון דחיקה, רביעי התאוששות, שבת מנוחה', () => {
    expect(dayPlanForDate([], '2026-09-27')).toEqual({ dayType: 'training', templateId: 'tpl-push' });
    expect(dayPlanForDate([], '2026-09-30').dayType).toBe('activeRecovery');
    expect(dayPlanForDate([], '2026-10-03')).toEqual({ dayType: 'rest', templateId: null });
  });
  it('כל קבוצה ראשית פעמיים בשבוע: דחיקה אופקית, משיכה אנכית', () => {
    const fams = DEFAULT_WEEK_DAYS.flatMap((d) => DEFAULT_TEMPLATES.find((t) => t.id === d.templateId)?.slots.map((s) => s.family) ?? []);
    expect(fams.filter((f) => f === 'horizontalPush')).toHaveLength(2);
    expect(fams.filter((f) => f === 'verticalPull')).toHaveLength(2);
  });
  it('תוכנית ברירת המחדל תקינה, ותוכנית שגויה נדחית', () => {
    expect(validateWeekDays(DEFAULT_WEEK_DAYS, DEFAULT_TEMPLATES)).toEqual([]);
    const bad = DEFAULT_WEEK_DAYS.map((d, i) => (i === 6 ? { dayType: 'rest' as const, templateId: 'tpl-push' } : d));
    expect(validateWeekDays(bad, DEFAULT_TEMPLATES)).toHaveLength(1);
  });
});
