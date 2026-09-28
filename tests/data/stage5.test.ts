import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow } from './helpers';
import { getDb } from '../../src/data/db';
import { listExercises, applyStatusChanges } from '../../src/data/repos/exercises';
import { finishWorkout, getHistory, listWorkoutExercises, logSet, planWorkout, startWorkout, activeWorkout } from '../../src/data/repos/workouts';
import { listPendingSuggestions } from '../../src/data/repos/suggestions';
import { approveSuggestion, rejectSuggestion } from '../../src/data/suggestionActions';
import { checkMissedWorkout, checkRecoverySwap, checkEarlyDeload } from '../../src/data/engineChecks';
import { getEffectiveDayPlan, isDeloadDate } from '../../src/data/plan';
import { updateDayLog, getDayLog } from '../../src/data/repos/dayLogs';
import { STRENGTH_LIMIT_SEC, TOTAL_LIMIT_SEC } from '../../src/domain/engine/buildWorkout';
import type { ExerciseStatus, Workout } from '../../src/domain/types';

/** אחרי "מבחן פתיחה": רמה 1–2 🟢, 3 🟡 */
async function afterTest() {
  const exs = await listExercises();
  const ch: Record<string, ExerciseStatus> = {};
  for (const e of exs) if (e.status) ch[e.id] = e.families[0].level <= 2 ? 'green' : e.families[0].level === 3 ? 'yellow' : 'red';
  await applyStatusChanges(ch);
}

/** אימון מלא: כל סט בקצה העליון (או נתון) */
async function doWorkout(date: string, value: (min: number, max: number) => number, rpe = 8) {
  setNow(date);
  const planned = await planWorkout(date, 'outdoor');
  const w = await startWorkout(date, 'outdoor', planned);
  for (const we of await listWorkoutExercises(w.id)) {
    const ex = planned.strength.find((s) => s.exercise.id === we.exerciseId)!.exercise;
    for (let n = 1; n <= we.targetSets; n++) {
      const v = value(we.targetMin, we.targetMax);
      const val = ex.measure === 'time' ? { reps: null, seconds: v } : { reps: v, seconds: null };
      if (ex.unilateral) {
        await logSet(we.id, { setNumber: n, side: 'right', ...val, load: null, rpe });
        await logSet(we.id, { setNumber: n, side: 'left', ...val, load: null, rpe });
      } else await logSet(we.id, { setNumber: n, side: 'none', ...val, load: null, rpe });
    }
  }
  return finishWorkout(w.id, { feeling: 8, notes: '' });
}

beforeEach(async () => {
  await freshApp('2026-10-04'); // ראשון
  await afterTest();
});

describe('מנוע אימונים מקצה לקצה (שלב 5)', () => {
  it('בנייה, התחלה, רישום, סיום — ובזמן', async () => {
    const planned = await planWorkout('2026-10-04', 'outdoor');
    expect(planned.templateName).toBe('דחיקה');
    expect(planned.strengthSec).toBeLessThanOrEqual(STRENGTH_LIMIT_SEC);
    expect(planned.totalSec).toBeLessThanOrEqual(TOTAL_LIMIT_SEC);
    const w = await startWorkout('2026-10-04', 'outdoor', planned);
    expect((await activeWorkout())?.id).toBe(w.id);
    const [first] = await listWorkoutExercises(w.id);
    await expect(logSet(first.id, { setNumber: 1, side: 'none', reps: 10, seconds: null, load: null, rpe: null })).rejects.toThrow('RPE');
    await logSet(first.id, { setNumber: 1, side: 'none', reps: 10, seconds: null, load: null, rpe: 8 });
    await finishWorkout(w.id, { feeling: 7, notes: '' });
    expect(await activeWorkout()).toBeUndefined();
    expect((await getHistory()).length).toBe(1);
  });

  it('יעד היום עולה לפי האימון הקודם (R-GEN-6, R-PRG-2)', async () => {
    await doWorkout('2026-10-04', (min) => min + 1);
    setNow('2026-10-08'); // חמישי: פלג גוף עליון, דחיקה אופקית שוב
    const p = await planWorkout('2026-10-08', 'outdoor');
    const hp = p.strength.find((i) => i.family === 'horizontalPush')!;
    expect(hp.targetValue).toBe(hp.exercise.targetMin + 2);
  });

  it('הושג פעמיים ברציפות → הצעה לעבור רמה, ואישור מקדם (R-PRG-3)', async () => {
    await doWorkout('2026-10-04', (_, max) => max);
    await doWorkout('2026-10-08', (_, max) => max);
    const sugg = await listPendingSuggestions();
    const adv = sugg.find((s) => s.type === 'advance' && s.refId === 'ex-knee-push-up');
    expect(adv).toBeTruthy();
    await approveSuggestion(adv!.id);
    const exs = await listExercises();
    expect(exs.find((e) => e.id === 'ex-knee-push-up')!.status).toBe('green');
    expect(exs.find((e) => e.id === 'ex-push-up')!.status).toBe('yellow');
    setNow('2026-10-11');
    const p = await planWorkout('2026-10-11', 'outdoor');
    expect(p.strength.find((i) => i.family === 'horizontalPush')!.exercise.id).toBe('ex-push-up');
  });

  it('R-DAY-5: לא מזהים "הוחמץ" לפני תחילת התוכנית', async () => {
    setNow('2026-10-05');
    await checkMissedWorkout();
    expect(await listPendingSuggestions()).toEqual([]);
  });

  it('R-DAY-5: אימון שהוחמץ — "בצע" מזיז את התבנית, "דלג" מסמן דולג', async () => {
    await freshApp('2026-10-03');
    await afterTest();
    await doWorkout('2026-10-03', (_, max) => max); // שבת: התחלת תוכנית (אימון שהושלם)
    setNow('2026-10-05'); // שני, ראשון הוחמץ
    await checkMissedWorkout();
    let [s] = (await listPendingSuggestions()).filter((x) => x.type === 'missedWorkout');
    expect(s).toMatchObject({ type: 'missedWorkout' });
    await approveSuggestion(s.id);
    expect((await getEffectiveDayPlan('2026-10-05')).templateId).toBe('tpl-push');
    expect((await getEffectiveDayPlan('2026-10-06')).templateId).toBe('tpl-pull');

    await freshApp('2026-10-03');
    await afterTest();
    await doWorkout('2026-10-03', (_, max) => max);
    setNow('2026-10-05');
    await checkMissedWorkout();
    [s] = (await listPendingSuggestions()).filter((x) => x.type === 'missedWorkout');
    await rejectSuggestion(s.id);
    const ws = (await getDb().data('workouts').toArray()) as Workout[];
    expect(ws.find((w) => w.date === '2026-10-04')?.status).toBe('skipped');
    expect((await getEffectiveDayPlan('2026-10-05')).templateId).toBe('tpl-pull');
  });

  it('R-REC-2: התאוששות נמוכה — אישור הופך ליום התאוששות, דחייה = 2 סטים ו-RPE 7', async () => {
    await updateDayLog('2026-10-04', { manualRecovery: 3 });
    await checkRecoverySwap();
    let [s] = await listPendingSuggestions();
    await rejectSuggestion(s.id);
    const p = await planWorkout('2026-10-04', 'outdoor');
    expect(p.strength.filter((i) => i.role === 'work').every((i) => i.sets === 2 && i.rpeTarget === '7')).toBe(true);

    await freshApp('2026-10-04');
    await afterTest();
    await updateDayLog('2026-10-04', { manualRecovery: 2 });
    await checkRecoverySwap();
    [s] = await listPendingSuggestions();
    await approveSuggestion(s.id);
    expect((await getEffectiveDayPlan('2026-10-04')).dayType).toBe('activeRecovery');
    expect((await getDayLog('2026-10-04'))?.dayType).toBe('activeRecovery');
  });

  it('R-DL-1: RPE ממוצע 9+ בשבוע שעבר → הצעה מוקדמת, ואישור הופך את השבוע להורדת עומס', async () => {
    await doWorkout('2026-10-04', (_, max) => max, 9);
    setNow('2026-10-11');
    expect(await isDeloadDate('2026-10-11')).toBe(false);
    await checkEarlyDeload();
    const s = (await listPendingSuggestions()).find((x) => x.type === 'deloadEarly')!;
    expect(s.reason).toContain('RPE');
    await approveSuggestion(s.id);
    expect(await isDeloadDate('2026-10-13')).toBe(true);
    const p = await planWorkout('2026-10-11', 'outdoor');
    expect(p.isDeload).toBe(true);
  });

  it('R-PRG-9: אימון בשבוע הורדת עומס לא יוצר הצעות', async () => {
    await doWorkout('2026-10-04', (_, max) => max);
    // שבוע 5 מתחיל ב-01.11
    const sugg = await doWorkout('2026-11-01', (_, max) => max);
    expect(sugg).toEqual([]);
  });
});
