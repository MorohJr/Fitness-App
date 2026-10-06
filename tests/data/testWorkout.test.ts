import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp } from './helpers';
import { getDb } from '../../src/data/db';
import { listExercises } from '../../src/data/repos/exercises';
import { activeWorkout, cancelWorkout, getHistory, listSets, listWorkoutExercises } from '../../src/data/repos/workouts';
import { deleteTestSet, finishTest, logTestSet, startTest, swapTestExercise, testReview } from '../../src/data/repos/testWorkout';
import { levelIn } from '../../src/domain/calc/exercises';

beforeEach(async () => {
  await freshApp('2026-10-06');
});

const status = async (id: string) => (await listExercises()).find((e) => e.id === id)!.status;

describe('✅ R-TST: מבחן פתיחה כאימון רגיל', () => {
  it('התחלה: אימון מבחן בביצוע, חימום, תרגיל לכל משפחה בסדר לסירוגין', async () => {
    const w = await startTest({ families: ['squat', 'horizontalPush', 'verticalPull'], location: 'outdoor', foundation: false });
    expect(w).toMatchObject({ kind: 'test', status: 'inProgress' });
    expect((await activeWorkout())?.id).toBe(w.id);
    expect((w.plan as { blocks: { key: string }[] }).blocks[0].key).toBe('warmup');
    const wes = await listWorkoutExercises(w.id);
    expect(wes.map((x) => x.family)).toEqual(['horizontalPush', 'verticalPull', 'squat']);
    expect(wes.every((x) => x.targetSets === 1 && x.role === 'work')).toBe(true);
    await expect(startTest({ families: ['squat'], location: 'outdoor', foundation: false })).rejects.toThrow('אימון בביצוע');
  });

  it('סט מעל הטווח מוסיף רמה מיד אחרי, עם מנוחה; מחיקה מסירה אותה', async () => {
    const w = await startTest({ families: ['horizontalPush', 'squat'], location: 'outdoor', foundation: false });
    let wes = await listWorkoutExercises(w.id);
    await swapTestExercise(wes[0].id, 'ex-push-up');
    const r = await logTestSet(wes[0].id, { value: 20, right: null, left: null });
    expect(r).toMatchObject({ status: 'green', added: true });
    wes = await listWorkoutExercises(w.id);
    expect(wes.map((x) => x.family)).toEqual(['horizontalPush', 'horizontalPush', 'squat']);
    expect(wes[1].level).toBe(5);
    expect((await activeWorkout())!.restEndsAt).toBeGreaterThan(Date.now() + 100_000);
    await expect(swapTestExercise(wes[0].id, 'ex-knee-push-up')).rejects.toThrow();
    await expect(logTestSet(wes[0].id, { value: 3, right: null, left: null })).rejects.toThrow('כבר');

    await deleteTestSet(wes[0].id);
    wes = await listWorkoutExercises(w.id);
    expect(wes.map((x) => x.family)).toEqual(['horizontalPush', 'squat']);
    expect(await listSets([wes[0].id])).toHaveLength(0);
    expect(wes[0].note).toBeNull();
  });

  it('תוצאה חסרה ← שגיאה', async () => {
    const w = await startTest({ families: ['horizontalPush'], location: 'outdoor', foundation: false });
    const [we] = await listWorkoutExercises(w.id);
    await expect(logTestSet(we.id, { value: null, right: null, left: null })).rejects.toThrow('הזן תוצאה');
  });

  it('✅ סיום: רק משפחות מאושרות משנות סטטוס, משפחה בלי סט נמחקת', async () => {
    const w = await startTest({ families: ['horizontalPush', 'verticalPull', 'squat'], location: 'outdoor', foundation: false });
    let wes = await listWorkoutExercises(w.id);
    await swapTestExercise(wes[0].id, 'ex-push-up');
    await logTestSet(wes[0].id, { value: 8, right: null, left: null }); // 🟡
    wes = await listWorkoutExercises(w.id);
    const pull = wes.find((x) => x.family === 'verticalPull')!;
    const pullEx = (await listExercises()).find((e) => e.id === pull.exerciseId)!;
    await logTestSet(pull.id, { value: pullEx.targetMin, right: null, left: null }); // 🟡 בתוך הטווח
    const review = await testReview(w.id);
    expect(review.find((r) => r.family === 'horizontalPush')!.changes['ex-push-up']).toBe('yellow');
    expect(Object.keys(review.find((r) => r.family === 'squat')!.changes)).toHaveLength(0);

    await finishTest(w.id, ['horizontalPush']);
    expect(await status('ex-push-up')).toBe('yellow');
    expect(await status(pull.exerciseId)).not.toBe('yellow'); // לא אושר
    const done = await getDb().data('workouts').get(w.id);
    expect(done.status).toBe('completed');
    expect((await listWorkoutExercises(w.id)).map((x) => x.family)).toEqual(['horizontalPush', 'verticalPull']);
    expect(await activeWorkout()).toBeUndefined();
    // נכנס להיסטוריה כמבחן, עם תוצאת המבחן (R-RANK)
    const h = (await getHistory()).find((x) => x.exerciseId === 'ex-push-up')!;
    expect(h).toMatchObject({ kind: 'test', statusAtTime: 'yellow' });
  });

  it('ביטול לא משנה סטטוס', async () => {
    const w = await startTest({ families: ['horizontalPush'], location: 'outdoor', foundation: false });
    const [we] = await listWorkoutExercises(w.id);
    await logTestSet(we.id, { value: 8, right: null, left: null });
    await cancelWorkout(w.id);
    expect(await activeWorkout()).toBeUndefined();
    expect(await status(we.exerciseId)).not.toBe('yellow');
  });

  it('R-TST-8: בבדיקת היסודות מתחילים מהרמה הקלה ביותר', async () => {
    const w = await startTest({ families: ['horizontalPush'], location: 'outdoor', foundation: true });
    const [we] = await listWorkoutExercises(w.id);
    const exs = await listExercises();
    const min = Math.min(...exs.filter((e) => levelIn(e, 'horizontalPush') !== null).map((e) => levelIn(e, 'horizontalPush')!));
    expect(we.level).toBe(min);
    expect(w.templateName).toBe('בדיקת רמה');
  });
});
