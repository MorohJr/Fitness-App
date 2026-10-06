import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp } from './helpers';
import { getDb } from '../../src/data/db';
import { listExercises } from '../../src/data/repos/exercises';
import { clearTestSession, confirmTestFamily, getTestSession, saveTestSession } from '../../src/data/repos/testSession';
import { deleteAllData } from '../../src/data/backup/backup';
import { chooseExercise, currentFamily, recordSet, startSession, type TestSession } from '../../src/domain/rules/R-TST';

beforeEach(async () => {
  await freshApp('2026-10-06');
});

const all = () => true;

describe('✅ R-TST-6: מבחן פתוח ממשיך מאותה נקודה', () => {
  it('שמירה, טעינה ואישור משפחה', async () => {
    const exs = await listExercises();
    let s = chooseExercise(startSession({ exercises: exs, families: ['horizontalPush', 'squat'], location: 'outdoor', foundation: false, usable: all, now: 1 }), 'ex-push-up');
    s = recordSet(s, exs, all, { value: 8, right: null, left: null }, 1) as TestSession;
    await saveTestSession(s);
    // "יציאה וחזרה": טוענים מחדש מהמסד
    const back = await getTestSession();
    expect(back).toEqual(s);
    const next = await confirmTestFamily(back!, exs, all, 2);
    expect(currentFamily(next)).toBe('squat');
    expect((await listExercises()).find((e) => e.id === 'ex-push-up')!.status).toBe('yellow');
    expect(await getDb().data('workouts').count()).toBe(1);
    expect(await getTestSession()).toEqual(next);
    await clearTestSession();
    expect(await getTestSession()).toBeNull();
  });
  it('מחיקת כל הנתונים מוחקת מבחן פתוח', async () => {
    const exs = await listExercises();
    await saveTestSession(startSession({ exercises: exs, families: ['squat'], location: 'outdoor', foundation: false, usable: all, now: 1 }));
    await deleteAllData();
    expect(await getTestSession()).toBeNull();
  });
});
