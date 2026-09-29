import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow } from './helpers';
import { getDb } from '../../src/data/db';
import { applyStatusChanges, listExercises, seedExercises } from '../../src/data/repos/exercises';
import { finishWorkout, listWorkoutExercises, logSet, planWorkout, startWorkout } from '../../src/data/repos/workouts';
import { listPendingSuggestions } from '../../src/data/repos/suggestions';
import { listTemplates, listWeekPlanVersions } from '../../src/data/repos/weekPlan';
import { approveSuggestion } from '../../src/data/suggestionActions';
import { checkFoundationDone, getFoundationState, startFoundation } from '../../src/data/foundation';
import { getDeloadContext, getEffectiveDayPlan, getFoundationInfo, isDeloadDate } from '../../src/data/plan';
import { FOUNDATION_FAMILIES, FOUNDATION_STRENGTH_LIMIT_SEC, FOUNDATION_TOTAL_LIMIT_SEC } from '../../src/domain/rules/R-BEG';
import { ladder } from '../../src/domain/calc/exercises';
import { weeklySummary } from '../../src/data/adherence';
import type { Exercise, ExerciseStatus } from '../../src/domain/types';

/** בדיקת רמה של מתחיל: הרמה הכי קלה בכל משפחת יסודות 🟡 */
async function levelCheck() {
  const exs = await listExercises();
  const ch: Record<string, ExerciseStatus> = {};
  for (const f of FOUNDATION_FAMILIES) {
    const lad = ladder(exs, f);
    const low = lad[0].families.find((x) => x.family === f)!.level;
    for (const e of lad.filter((e) => e.families.find((x) => x.family === f)!.level === low)) ch[e.id] = 'yellow';
  }
  await applyStatusChanges(ch);
}

async function doWorkout(date: string) {
  setNow(date);
  const planned = await planWorkout(date, 'home');
  const w = await startWorkout(date, 'home', planned);
  for (const we of await listWorkoutExercises(w.id)) {
    const ex = planned.strength.find((s) => s.exercise.id === we.exerciseId)!.exercise;
    for (let n = 1; n <= we.targetSets; n++) {
      const val = ex.measure === 'time' ? { reps: null, seconds: we.targetMin } : { reps: we.targetMin, seconds: null };
      for (const side of ex.unilateral ? (['right', 'left'] as const) : (['none'] as const)) await logSet(we.id, { setNumber: n, side, ...val, load: null, rpe: 7 });
    }
  }
  return finishWorkout(w.id, { feeling: 7, notes: '' });
}

async function approveFoundationSwitch() {
  const { switchToRegular } = await import('../../src/data/foundation');
  await switchToRegular();
}

beforeEach(async () => {
  await freshApp('2026-09-29'); // שלישי
});

describe('תבניות ותרגילים חדשים (2.7)', () => {
  it('תבניות היסודות נוספות למסד, והתרגילים החדשים נטענים', async () => {
    const ids = (await listTemplates()).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(['tpl-found-upper', 'tpl-found-lower', 'tpl-walk', 'tpl-push']));
    expect((await listExercises()).some((e) => e.id === 'ex-chair-squat')).toBe(true);
  });
  it('תרגיל רמה 0 חדש במשפחה שכבר נבדקה מתחיל 🟢 (כמו פרק 6); במשפחה שלא נבדקה 🔴', async () => {
    const db = getDb();
    await applyStatusChanges({ 'ex-bodyweight-squat': 'yellow' });
    await db.data('exercises').delete('ex-chair-squat');
    await db.data('exercises').delete('ex-knee-plank');
    expect(await seedExercises()).toBe(2);
    expect(((await db.data('exercises').get('ex-chair-squat')) as Exercise).status).toBe('green');
    expect(((await db.data('exercises').get('ex-knee-plank')) as Exercise).status).toBe('red');
  });
});

describe('✅ בדיקת קבלה 9א: בדיקת רמה ← יסודות מהיום (2.8) ← אימון עד 60 דקות', () => {
  it('R-BEG-2 (2.9): בלי בדיקת רמה, תרגילי ההתחלה עוברים ל-🟡 ואפשר להתאמן מיד', async () => {
    const st = await getFoundationState();
    expect(st.startList).toHaveLength(11);
    const squat = st.startList.find((r) => r.family === 'squat')!;
    expect(squat.exercises.map((e) => e.id).sort()).toEqual(['ex-chair-squat', 'ex-wall-sit']);
    // בחוץ אין Towel Lat Pulldown? יש (בלי ציוד), אז רק רמה 0 במשיכה אנכית
    expect(st.startList.find((r) => r.family === 'verticalPull')!.exercises.map((e) => e.name)).toEqual(['Towel Lat Pulldown']);

    await startFoundation();
    const exs = await listExercises();
    const status = (id: string) => exs.find((e) => e.id === id)!.status;
    expect(status('ex-chair-squat')).toBe('yellow');
    expect(status('ex-wall-push-up')).toBe('yellow');
    expect(status('ex-glute-bridge')).toBe('yellow'); // בלי רמה 0: הרמה הקלה ביותר
    expect(status('ex-push-up')).toBe('red');
    const planned = await planWorkout('2026-09-29', 'home');
    expect(planned.dayType).toBe('activeRecovery'); // שלישי: הליכה
    const wed = await planWorkout('2026-10-01', 'home'); // חמישי: יסודות א׳
    expect(wed.strength.length).toBeGreaterThanOrEqual(4);
    expect(wed.strength.filter((i) => i.role === 'work').every((i) => i.note?.includes('R-BEG-7'))).toBe(true);
  });

  it('משפחה שכבר נבדקה לא משתנה', async () => {
    await applyStatusChanges({ 'ex-push-up': 'yellow' });
    const row = (await getFoundationState()).startList.find((r) => r.family === 'horizontalPush')!;
    expect(row.ready).toBe(true);
    await startFoundation();
    const exs = await listExercises();
    expect(exs.find((e) => e.id === 'ex-wall-push-up')!.status).toBe('red');
  });

  it('✅ R-BEG-7: כיול, סט מעל הטווח באימון הראשון ← הצעה לעלות רמה מיד', async () => {
    await startFoundation();
    setNow('2026-10-01');
    const planned = await planWorkout('2026-10-01', 'home');
    const w = await startWorkout('2026-10-01', 'home', planned);
    const wes = await listWorkoutExercises(w.id);
    const wall = wes.find((x) => x.exerciseId === 'ex-wall-push-up')!;
    for (const we of wes) {
      const ex = planned.strength.find((s) => s.exercise.id === we.exerciseId)!.exercise;
      const v = we.id === wall.id ? we.targetMax + 6 : we.targetMin;
      for (let n = 1; n <= we.targetSets; n++)
        for (const side of ex.unilateral ? (['right', 'left'] as const) : (['none'] as const))
          await logSet(we.id, { setNumber: n, side, reps: ex.measure === 'time' ? null : v, seconds: ex.measure === 'time' ? v : null, load: null, rpe: 7 });
    }
    const created = await finishWorkout(w.id, { feeling: 7, notes: '' });
    const adv = created.filter((s) => s.type === 'advance');
    expect(adv).toHaveLength(1);
    expect(adv[0].payload.exerciseId).toBe('ex-wall-push-up');
    expect(adv[0].reason).toContain('R-BEG-7');
  });

  it('מקצה לקצה', async () => {
    await levelCheck();
    expect((await getFoundationState()).readyFamilies).toHaveLength(11);
    expect((await getFoundationState()).startsOn).toBe('2026-09-29');
    const v = await startFoundation();
    // R-BEG-2 (2.8): תוכנית יסודות ראשונה מהיום, גם באמצע השבוע
    expect(v.effectiveFrom).toBe('2026-09-29');
    expect(v.program).toBe('foundation');
    expect(await getFoundationInfo('2026-09-29')).toEqual({ start: '2026-09-29', week: 1 });
    expect((await getFoundationInfo('2026-10-05'))?.week).toBe(1);
    expect((await getFoundationInfo('2026-10-06'))?.week).toBe(2);
    expect((await getEffectiveDayPlan('2026-09-29')).templateId).toBe('tpl-walk'); // שלישי

    setNow('2026-10-04');
    expect((await getEffectiveDayPlan('2026-10-04')).templateId).toBe('tpl-found-upper');
    const planned = await planWorkout('2026-10-04', 'home');
    expect(planned.strength.length).toBeGreaterThanOrEqual(4);
    expect(planned.strengthSec).toBeLessThanOrEqual(FOUNDATION_STRENGTH_LIMIT_SEC);
    expect(planned.totalSec).toBeLessThanOrEqual(FOUNDATION_TOTAL_LIMIT_SEC);
    expect(planned.blocks.some((b) => b.key === 'cardio')).toBe(true);
    expect(planned.strength.filter((i) => i.role === 'work').every((i) => i.sets === 2)).toBe(true);

    // שלישי: הליכה ומוביליטי
    const tue = await getEffectiveDayPlan('2026-10-06');
    expect(tue).toEqual({ dayType: 'activeRecovery', templateId: 'tpl-walk' });

    // R-BEG-5 (2.8): הסיכום השבועי לא משווה ליעד הנפח בשבוע של יסודות
    expect((await weeklySummary('2026-09-27')).foundation).toBe(true);
    expect((await weeklySummary('2026-09-20')).foundation).toBe(false);
  });
});

describe('✅ בדיקת קבלה 9א: אחרי 6 שבועות מוצע מעבר, והורדת העומס מתחילה רק אז', () => {
  it('תוכנית יסודות שנייה מתחילה מיום ראשון הבא (R-VER-2)', async () => {
    await levelCheck();
    await startFoundation();
    await approveFoundationSwitch();
    setNow('2026-10-07');
    const again = await startFoundation();
    expect(again.effectiveFrom).toBe('2026-10-11');
  });

  it('מקצה לקצה', async () => {
    setNow('2026-10-04'); // מתחילים ביום ראשון, כמו קודם
    await levelCheck();
    await startFoundation();
    await doWorkout('2026-10-04');
    await doWorkout('2026-10-26');
    // R-BEG-5: אין הורדת עומס ביסודות, והספירה לא התחילה
    expect((await getDeloadContext()).programStart).toBeNull();
    for (const d of ['2026-10-04', '2026-11-01', '2026-11-08']) expect(await isDeloadDate(d)).toBe(false);

    // שבוע 5: עוד לא
    setNow('2026-11-01');
    await checkFoundationDone();
    expect((await listPendingSuggestions()).filter((s) => s.type === 'foundationDone')).toHaveLength(0);

    // שבוע 6: הצעה אחת (גם אם הבדיקה רצה פעמיים)
    setNow('2026-11-08');
    await checkFoundationDone();
    await checkFoundationDone();
    const sugg = (await listPendingSuggestions()).filter((s) => s.type === 'foundationDone');
    expect(sugg).toHaveLength(1);
    await approveSuggestion(sugg[0].id);

    const versions = await listWeekPlanVersions();
    expect(versions.at(-1)).toMatchObject({ effectiveFrom: '2026-11-15', program: 'regular' });
    expect((await getFoundationState('2026-11-08')).switchPending?.effectiveFrom).toBe('2026-11-15');
    await checkFoundationDone();
    expect((await listPendingSuggestions()).filter((s) => s.type === 'foundationDone')).toHaveLength(0);

    // התוכנית הרגילה, והספירה מתחילה באימון הרגיל הראשון
    expect((await getEffectiveDayPlan('2026-11-15')).templateId).toBe('tpl-push');
    expect(await getFoundationInfo('2026-11-15')).toBeNull();
    await applyStatusChanges({ 'ex-wall-push-up': 'yellow', 'ex-pike-push-up': 'yellow' });
    await doWorkout('2026-11-15');
    expect((await getDeloadContext()).programStart).toBe('2026-11-15');
  });
});
