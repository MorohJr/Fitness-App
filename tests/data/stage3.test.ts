import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow, TARGETS } from './helpers';
import { addWater, getDayLog, updateDayLog } from '../../src/data/repos/dayLogs';
import { saveTargets } from '../../src/data/repos/targets';
import { listSupplementLogs, saveSupplement, setSupplementTaken } from '../../src/data/repos/supplements';
import { recoveryScore } from '../../src/domain/rules/R-REC';

beforeEach(async () => {
  await freshApp('2026-09-28');
});

describe('יומן יומי (שלב 3)', () => {
  it('שמירת שדות וציון התאוששות', async () => {
    await updateDayLog('2026-09-28', { sleepHours: 6, sleepQuality: 7, energy: 6, doms: 3 });
    const log = (await getDayLog('2026-09-28'))!;
    expect(recoveryScore(log).score).toBe(7.3);
  });
  it('שתייה מצטברת, ומחזירה את הקודם לביטול', async () => {
    expect(await addWater('2026-09-28', 250)).toBe(0);
    expect(await addWater('2026-09-28', 500)).toBe(250);
    expect((await getDayLog('2026-09-28'))!.waterMl).toBe(750);
  });
  it('משקל בוקר משנה את משקל הייחוס של היום', async () => {
    await saveTargets(TARGETS);
    await updateDayLog('2026-09-28', { morningWeightKg: 90 });
    expect((await getDayLog('2026-09-28'))!.targets.referenceWeightKg).toBe(90);
  });
  it('עריכת יום שעבר לא משנה את יעדי אותו יום', async () => {
    await saveTargets(TARGETS);
    await updateDayLog('2026-09-28', { morningWeightKg: 80 });
    setNow('2026-09-29');
    await saveTargets({ ...TARGETS, calories: 1800 });
    await updateDayLog('2026-09-28', { steps: 5000 });
    const log = (await getDayLog('2026-09-28'))!;
    expect(log.steps).toBe(5000);
    expect(log.targets.calories).toBe(2400);
  });
  it('תוסף: שם ומינון נשמרים כתמונת מצב', async () => {
    const s = await saveSupplement({ name: 'Creatine', dose: '5 ג׳', timing: 'morning', active: true });
    await setSupplementTaken('2026-09-28', s, true);
    await saveSupplement({ name: 'Creatine', dose: '3 ג׳', timing: 'morning', active: true }, s.id);
    const logs = await listSupplementLogs('2026-09-28');
    expect(logs[0]).toMatchObject({ taken: true, dose: '5 ג׳' });
    await setSupplementTaken('2026-09-28', s, false);
    expect((await listSupplementLogs('2026-09-28'))[0].taken).toBe(false);
  });
});
