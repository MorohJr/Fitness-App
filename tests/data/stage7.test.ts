import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow, TARGETS } from './helpers';
import { getDayChecks, summaryWeek, weeklySummary } from '../../src/data/adherence';
import { saveTargets } from '../../src/data/repos/targets';
import { updateProfile } from '../../src/data/repos/profile';
import { logQuick } from '../../src/data/repos/nutrition';
import { updateDayLog } from '../../src/data/repos/dayLogs';
import { streak } from '../../src/domain/rules/R-ADH';

beforeEach(async () => {
  await freshApp('2026-10-04');
  await updateProfile({ manualWeightKg: 80 });
  await saveTargets({ ...TARGETS, calories: 2000 });
});

describe('עמידה ביעדים מהמסד (שלב 7)', () => {
  it('יום תזונה שעמד ביעד, יום אימון בלי אימון', async () => {
    await logQuick('2026-10-04', 2000, 150, 'יום');
    const c = (await getDayChecks('2026-10-04', '2026-10-04')).get('2026-10-04')!;
    expect(c).toMatchObject({ hasLog: true, nutrition: true, training: false, dayType: 'training' });
  });
  it('רצף עם יום התאוששות שהושלם בלבד (רביעי) נשבר בלי אימון', async () => {
    for (const d of ['2026-10-04', '2026-10-05']) {
      setNow(d);
      await updateDayLog(d, { steps: 1 });
      await logQuick(d, 2000, 150, 'יום');
    }
    const checks = await getDayChecks('2026-10-04', '2026-10-05');
    expect(streak(checks, '2026-10-05')).toBe(0); // אין אימונים
  });
  it('סיכום שבועי: שינוי במשקל המגמה', async () => {
    for (let i = 0; i < 10; i++) {
      const d = `2026-10-${String(i + 1).padStart(2, '0')}`;
      setNow(d);
      await updateDayLog(d, { morningWeightKg: 80 - i * 0.1 });
    }
    const s = await weeklySummary('2026-10-04');
    expect(s.trendChange).toBeLessThan(0);
    expect(s.volume.length).toBe(6);
  });
  it('מתי מוצג הסיכום', () => {
    expect(summaryWeek('2026-10-10', new Date(2026, 9, 10, 19))).toBe('2026-10-04');
    expect(summaryWeek('2026-10-10', new Date(2026, 9, 10, 12))).toBeNull();
    expect(summaryWeek('2026-10-11', new Date(2026, 9, 11, 9))).toBe('2026-10-04');
    expect(summaryWeek('2026-10-12', new Date(2026, 9, 12, 9))).toBeNull();
  });
});
