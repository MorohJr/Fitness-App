import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, TARGETS } from './helpers';
import { createPhotoSet, deletePhotoSet, listMeasurements, listPhotoSets, saveMeasurement } from '../../src/data/repos/body';
import { updateProfile } from '../../src/data/repos/profile';
import { saveTargets } from '../../src/data/repos/targets';
import { getDayLog } from '../../src/data/repos/dayLogs';
import { composition } from '../../src/domain/calc/bodyfat';

beforeEach(async () => {
  await freshApp('2026-10-01');
  await updateProfile({ sex: 'male', heightCm: 180, birthDate: '1990-01-01' });
});

describe('מדידות (שלב 6)', () => {
  it('גובה ומין נשמרים במדידה: שינוי בפרופיל לא משנה אחוז שומן היסטורי', async () => {
    await saveMeasurement({ date: '2026-10-01', weightKg: 80, circ: { waist: 85, neck: 38 }, notes: '' });
    const before = composition((await listMeasurements())[0]).bodyFat;
    await updateProfile({ heightCm: 170 });
    expect(composition((await listMeasurements())[0]).bodyFat).toBe(before);
  });
  it('משקל ממדידה משמש משקל ייחוס', async () => {
    await saveTargets(TARGETS);
    await saveMeasurement({ date: '2026-10-01', weightKg: 90, circ: {}, notes: '' });
    expect((await getDayLog('2026-10-01'))!.targets.referenceWeightKg).toBe(90);
  });
  it('תאריך עתידי וערכים לא סבירים נדחים', async () => {
    await expect(saveMeasurement({ date: '2026-10-05', weightKg: 80, circ: {}, notes: '' })).rejects.toThrow();
    await expect(saveMeasurement({ date: '2026-10-01', weightKg: null, circ: {}, notes: '' })).rejects.toThrow();
  });
});

describe('✅ סט הבסיס לא נמחק (R-PHOTO-2)', () => {
  it('הסט הראשון הוא בסיס, ומחיקה שלו נדחית', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    const base = await createPhotoSet('2026-10-01', null, { front: blob, back: blob, side: blob });
    const second = await createPhotoSet('2026-10-01', null, { front: blob });
    expect(base.isBaseline).toBe(true);
    expect(second.isBaseline).toBe(false);
    await expect(deletePhotoSet(base.id)).rejects.toThrow('R-PHOTO-2');
    await deletePhotoSet(second.id);
    expect((await listPhotoSets()).map((s) => s.id)).toEqual([base.id]);
  });
});
