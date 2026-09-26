import { describe, expect, it } from 'vitest';
import { backupReminderDue } from '../../src/domain/rules/R-REM';

const now = new Date('2026-09-27T10:00:00Z');
describe('תזכורת גיבוי (3.4)', () => {
  it('מופיעה רק אחרי יותר מ-3 ימים מהייצוא האחרון', () => {
    expect(backupReminderDue('2026-09-24T11:00:00Z', null, now, 3)).toBe(false);
    expect(backupReminderDue('2026-09-24T09:00:00Z', null, now, 3)).toBe(true);
  });
  it('בלי ייצוא: לפי ההפעלה הראשונה', () => {
    expect(backupReminderDue(null, '2026-09-26T10:00:00Z', now, 3)).toBe(false);
    expect(backupReminderDue(null, '2026-09-20T10:00:00Z', now, 3)).toBe(true);
  });
  it('מרווח שונה', () => {
    expect(backupReminderDue('2026-09-20T10:00:00Z', null, now, 7)).toBe(false);
  });
});
