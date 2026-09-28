import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp } from './helpers';
import { getDb } from '../../src/data/db';
import { initData } from '../../src/data/init';
import { listExercises, setExerciseStatus, updateExercise, addCustomExercise } from '../../src/data/repos/exercises';
import { saveTestFamily } from '../../src/data/repos/workouts';
import { listInjuries, saveInjury } from '../../src/data/repos/injuries';
import { evaluateTest, familyReady, familyStatusChanges } from '../../src/domain/rules/opening-test';
import { ladder, levelIn } from '../../src/domain/calc/exercises';
import { STRENGTH_FAMILIES } from '../../src/domain/families';
import { isBlocked } from '../../src/domain/rules/R-INJ';
import { getProfile } from '../../src/data/repos/profile';
import type { DayTemplate } from '../../src/domain/types';

beforeEach(async () => {
  await freshApp('2026-09-28');
});

describe('✅ בדיקת קבלה: אחרי מבחן פתיחה, בכל משפחה יש 🟢 או 🟡', () => {
  it('מבחן מלא לכל 16 המשפחות (תוצאות מגוונות)', async () => {
    const outcomes = [15, 8, 3]; // מעל, בתוך, מתחת
    let k = 0;
    for (const fam of STRENGTH_FAMILIES) {
      const exs = await listExercises();
      const lad = ladder(exs, fam);
      // מתחילים באמצע הסולם
      let cur = lad[Math.floor(lad.length / 2)];
      const tested: number[] = [];
      const results: { exerciseId: string; level: number; status: 'red' | 'yellow' | 'green' }[] = [];
      for (let guard = 0; guard < 10; guard++) {
        const lvl = levelIn(cur, fam)!;
        tested.push(lvl);
        const raw = outcomes[k++ % 3];
        const value = raw >= 15 ? cur.targetMax + 1 : raw === 8 ? cur.targetMin : Math.max(0, cur.targetMin - 1);
        const o = evaluateTest(exs, fam, { exerciseId: cur.id, level: lvl, value }, cur.targetMin, cur.targetMax, tested);
        results.push({ exerciseId: cur.id, level: lvl, status: o.status });
        if (o.next.action === 'done') break;
        const nextLevel = o.next.level;
        cur = lad.find((e) => levelIn(e, fam) === nextLevel)!;
      }
      const changes = familyStatusChanges(exs, fam, results);
      await saveTestFamily('outdoor', results.map((r) => ({ exercise: exs.find((e) => e.id === r.exerciseId)!, family: fam, value: 5, right: 5, left: 5, status: r.status })), changes);
    }
    const after = await listExercises();
    for (const fam of STRENGTH_FAMILIES) expect(familyReady(after, fam), fam).toBe(true);
    // התוצאות נשמרו כאימון אחד מסוג מבחן, עם סטים
    const workouts = await getDb().data('workouts').toArray();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].kind).toBe('test');
    expect(await getDb().data('setLogs').count()).toBeGreaterThan(16);
  });
});

describe('✅ בדיקת קבלה: פציעה פעילה חוסמת (מהמסד)', () => {
  it('פציעה בברך חוסמת סקוואט ורגל אחת', async () => {
    await saveInjury({ area: 'knee', pain: 6, status: 'active', startDate: '2026-09-28', healedDate: null, notes: '', blockedExercises: [], blockedFamilies: ['squat', 'singleLeg'], blockedMuscles: [] });
    const [exs, inj] = [await listExercises(), await listInjuries()];
    const blocked = exs.filter((e) => isBlocked(e, inj)).map((e) => e.id);
    expect(blocked).toContain('ex-bodyweight-squat');
    expect(blocked).toContain('ex-shrimp-squat');
    expect(blocked).not.toContain('ex-push-up');
  });
  it('פציעה שהחלימה דורשת תאריך החלמה', async () => {
    await expect(saveInjury({ area: 'knee', pain: 2, status: 'healed', startDate: '2026-09-01', healedDate: null, notes: '', blockedExercises: [], blockedFamilies: [], blockedMuscles: [] })).rejects.toThrow();
  });
});

describe('מאגר ועדכונים לנתונים קיימים', () => {
  it('המאגר נטען פעם אחת, ולא דורס שינויים שלך', async () => {
    const n = (await listExercises()).length;
    expect(n).toBe(72);
    await setExerciseStatus('ex-push-up', 'yellow');
    await updateExercise('ex-push-up', { targetMax: 15 });
    await initData();
    const pu = (await listExercises()).find((e) => e.id === 'ex-push-up')!;
    expect((await listExercises()).length).toBe(n);
    expect(pu.status).toBe('yellow');
    expect(pu.targetMax).toBe(15);
  });
  it('תרגיל שלי', async () => {
    const e = await addCustomExercise({ name: 'Ring Row', families: [{ family: 'horizontalPull', level: 3 }], measure: 'reps', unilateral: false, equipment: [], primaryMuscles: ['back'], secondaryMuscles: [], targetMin: 6, targetMax: 12, restSec: 120, tempo: '3-1-1-0', cues: [], safety: '' });
    expect(e.custom).toBe(true);
    expect(e.status).toBe('red');
  });
  it('תבנית ישנה עם "ליבה" כללית מתעדכנת למיפוי החדש', async () => {
    const db = getDb();
    const t = (await db.data('dayTemplates').get('tpl-push')) as DayTemplate;
    await db.data('dayTemplates').put({ ...t, slots: t.slots.map((s) => (s.family === 'plank' ? { ...s, family: 'core' } : s)) });
    await initData();
    const after = (await db.data('dayTemplates').get('tpl-push')) as DayTemplate;
    expect(after.slots.map((s) => s.family)).toContain('plank');
    expect(after.slots.map((s) => s.family)).not.toContain('core');
  });
  it('פרופיל ישן מקבל "משטח מוגבה" ברשימה, ובמיקום עם ספסל', async () => {
    const db = getDb();
    const p = (await getProfile())!;
    await db.data('profile').put({
      ...p,
      equipment: p.equipment.filter((e) => e.id !== 'elevated'),
      locations: p.locations.map((l) => ({ ...l, equipmentIds: l.equipmentIds.filter((x) => x !== 'elevated') }))
    });
    await initData();
    const after = (await getProfile())!;
    expect(after.equipment.some((e) => e.id === 'elevated')).toBe(true);
    expect(after.locations.find((l) => l.id === 'outdoor')!.equipmentIds).toContain('elevated');
    expect(after.locations.find((l) => l.id === 'home')!.equipmentIds).not.toContain('elevated');
  });
});
