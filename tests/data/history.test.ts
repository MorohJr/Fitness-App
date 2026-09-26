import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow, TARGETS } from './helpers';
import { saveTargets, listTargetVersions } from '../../src/data/repos/targets';
import { computeTargetsFor, getDayLog, getTargetsForDay } from '../../src/data/repos/dayLogs';
import { updateProfile } from '../../src/data/repos/profile';
import { getDayPlan, listWeekPlanVersions, saveWeekPlan } from '../../src/data/repos/weekPlan';
import { listPhases, savePhase } from '../../src/data/repos/phases';
import { DEFAULT_WEEK_DAYS } from '../../src/domain/rules/R-DAY';
import { initData } from '../../src/data/init';

beforeEach(async () => {
  await freshApp('2026-09-27');
  await updateProfile({ manualWeightKg: 80, manualWeightDate: '2026-09-27' });
});

describe('✅ בדיקת קבלה: שינוי יעד קלורי לא משנה יעדים של יום קודם (E1)', () => {
  it('היום הקודם שומר את היעד הישן, גם ב-DayLog וגם בחישוב לפי גרסאות', async () => {
    await saveTargets(TARGETS);
    expect((await getDayLog('2026-09-27'))?.targets.calories).toBe(2400);

    setNow('2026-09-28');
    await initData(); // פתיחת האפליקציה ביום החדש
    await saveTargets({ ...TARGETS, calories: 2000 });

    expect((await getDayLog('2026-09-27'))?.targets.calories).toBe(2400);
    expect((await getDayLog('2026-09-27'))?.targets.proteinG).toBe(144);
    expect((await computeTargetsFor('2026-09-27')).calories).toBe(2400);
    expect((await getTargetsForDay('2026-09-28')).calories).toBe(2000);
    expect(await listTargetVersions()).toHaveLength(2);
  });

  it('יום שלא נפתח באפליקציה מקבל את מה שהיה בתוקף בו (R-VER-1)', async () => {
    await saveTargets(TARGETS);
    setNow('2026-10-01');
    await saveTargets({ ...TARGETS, calories: 1900 });
    // 28–30 לא נפתחו
    expect(await getDayLog('2026-09-29')).toBeUndefined();
    expect((await getTargetsForDay('2026-09-29')).calories).toBe(2400);
    expect((await getTargetsForDay('2026-10-01')).calories).toBe(1900);
  });

  it('שינוי נוסף באותו יום מחליף את הגרסה ומעדכן את היום הנוכחי', async () => {
    await saveTargets(TARGETS);
    await saveTargets({ ...TARGETS, calories: 2300 });
    expect(await listTargetVersions()).toHaveLength(1);
    expect((await getDayLog('2026-09-27'))?.targets.calories).toBe(2300);
  });

  it('אי אפשר לשמור יעד שמתחיל בעבר', async () => {
    await expect(saveTargets(TARGETS, '2026-09-26')).rejects.toThrow();
  });

  it('יום סגור לא משתנה כשהמשקל הידני משתנה', async () => {
    await saveTargets(TARGETS);
    setNow('2026-09-28');
    await updateProfile({ manualWeightKg: 90 });
    await initData();
    expect((await getDayLog('2026-09-27'))?.targets.proteinG).toBe(144);
    expect((await getDayLog('2026-09-28'))?.targets.proteinG).toBe(162);
  });

  it('משקל ידני חדש מעדכן מיד את מאקרו היום', async () => {
    await saveTargets(TARGETS);
    await updateProfile({ manualWeightKg: 90 });
    expect((await getDayLog('2026-09-27'))?.targets.proteinG).toBe(162);
  });

  it('שלב חדש מהיום משנה את היום ולא את אתמול', async () => {
    await saveTargets(TARGETS);
    setNow('2026-09-28');
    await initData();
    await savePhase({ type: 'cut', startDate: '2026-09-28', endDate: null, calories: 2100, weeklyRateKg: -0.5 });
    expect((await getDayLog('2026-09-27'))?.targets.calories).toBe(2400);
    expect((await getDayLog('2026-09-28'))?.targets.calories).toBe(2100);
    expect((await getDayLog('2026-09-28'))?.targets.calorieSource).toBe('phase');
  });
});

describe('תוכנית שבועית (R-DAY-1, R-VER-2)', () => {
  it('ברירת מחדל מההפעלה הראשונה, ושינוי חל מראשון הבא', async () => {
    expect(await listWeekPlanVersions()).toHaveLength(1);
    setNow('2026-09-29'); // שלישי
    const days = structuredClone(DEFAULT_WEEK_DAYS);
    days[2] = { dayType: 'rest', templateId: null };
    const v = await saveWeekPlan(days);
    expect(v.effectiveFrom).toBe('2026-10-04');
    expect((await getDayPlan('2026-09-29')).dayType).toBe('training');
    expect((await getDayPlan('2026-10-06')).dayType).toBe('rest');
  });
  it('תוכנית לא תקינה נדחית', async () => {
    const days = structuredClone(DEFAULT_WEEK_DAYS);
    days[0] = { dayType: 'training', templateId: null };
    await expect(saveWeekPlan(days)).rejects.toThrow();
  });
});

describe('שלבים (4.1)', () => {
  it('שלב חדש סוגר את הקודם', async () => {
    await savePhase({ type: 'cut', startDate: '2026-09-27', endDate: null, calories: 2100, weeklyRateKg: -0.5 });
    await savePhase({ type: 'maintain', startDate: '2026-11-01', endDate: null, calories: 2500, weeklyRateKg: 0 });
    const ps = await listPhases();
    expect(ps[0].endDate).toBe('2026-10-31');
    expect(ps[1].endDate).toBeNull();
  });
  it('שלב בעבר נדחה', async () => {
    await expect(savePhase({ type: 'cut', startDate: '2026-09-20', endDate: null, calories: 2100, weeklyRateKg: -0.5 })).rejects.toThrow();
  });
});
