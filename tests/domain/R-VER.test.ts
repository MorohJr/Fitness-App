import { describe, expect, it } from 'vitest';
import { planVersionSave, snapshotIsLive, versionForDate, weekPlanEffectiveFrom } from '../../src/domain/rules/R-VER';
import { tv } from './helpers';

describe('R-VER-1 גרסה בתוקף', () => {
  const versions = [tv('a', '2026-09-01', 2000), tv('b', '2026-09-20', 2200), tv('c', '2026-10-01', 2400)];
  it('הגרסה האחרונה שהתחילה עד התאריך', () => {
    expect(versionForDate(versions, '2026-09-19')?.id).toBe('a');
    expect(versionForDate(versions, '2026-09-20')?.id).toBe('b');
    expect(versionForDate(versions, '2026-10-05')?.id).toBe('c');
    expect(versionForDate(versions, '2026-08-01')).toBeNull();
  });
  it('גרסה מחוקה לא נחשבת', () => {
    const del = [...versions.slice(0, 2), { ...tv('d', '2026-09-25', 9999), deletedAt: 'x' }];
    expect(versionForDate(del, '2026-09-26')?.id).toBe('b');
  });
});

describe('R-VER-2 שמירת גרסה', () => {
  const versions = [tv('a', '2026-09-01', 2000), tv('b', '2026-09-27', 2200)];
  it('אותו תאריך התחלה = החלפה, אחרת גרסה חדשה', () => {
    expect(planVersionSave(versions, '2026-09-27', '2026-09-27')).toEqual({ action: 'replace', id: 'b' });
    expect(planVersionSave(versions, '2026-09-28', '2026-09-27')).toEqual({ action: 'create' });
  });
  it('גרסה שמתחילה בעבר נדחית', () => {
    expect(() => planVersionSave(versions, '2026-09-26', '2026-09-27')).toThrow();
  });
  it('תוכנית שבועית: מראשון הבא, או מהיום אם אין תוכנית', () => {
    expect(weekPlanEffectiveFrom('2026-09-29', true)).toBe('2026-10-04');
    expect(weekPlanEffectiveFrom('2026-09-29', false)).toBe('2026-09-29');
  });
});

describe('R-VER-3 תמונת מצב', () => {
  it('מתעדכנת רק ביום הנוכחי', () => {
    expect(snapshotIsLive('2026-09-27', '2026-09-27')).toBe(true);
    expect(snapshotIsLive('2026-09-26', '2026-09-27')).toBe(false);
  });
});
