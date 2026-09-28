import { describe, expect, it } from 'vitest';
import { evaluateTest, familyReady, familyStatusChanges, testValue } from '../../src/domain/rules/opening-test';
import { buildSeedExercises } from '../../src/data/seed/exercises';
import type { Exercise } from '../../src/domain/types';

const ex = (): Exercise[] => buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));
const push = (id: string) => ex().find((e) => e.id === id)!;

describe('מבחן פתיחה (פרק 6)', () => {
  it('מעל הטווח: 🟢 ובודקים את הרמה הבאה', () => {
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-push-up', level: 4, value: 15 }, 6, 12, [4]);
    expect(o.status).toBe('green');
    expect(o.next).toEqual({ action: 'higher', level: 5 });
  });
  it('בתוך הטווח: 🟡 וסיום', () => {
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-push-up', level: 4, value: 8 }, 6, 12, [4]);
    expect(o.status).toBe('yellow');
    expect(o.next.action).toBe('done');
  });
  it('מתחת לטווח: 🔴 ובודקים את הקלה יותר', () => {
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-push-up', level: 4, value: 3 }, 6, 12, [4]);
    expect(o.status).toBe('red');
    expect(o.next).toEqual({ action: 'lower', level: 3 });
  });
  it('מתחת לטווח ברמה הקלה ביותר: 🟡 בכל זאת', () => {
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-wall-push-up', level: 1, value: 2 }, 6, 12, [1]);
    expect(o.status).toBe('yellow');
    expect(o.next.action).toBe('done');
  });
  it('לא חוזרים לרמה שכבר נבדקה', () => {
    // עבר את 4, נכשל ב-5: הרמה הקלה (4) כבר נבדקה, מסיימים
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-diamond-push-up', level: 5, value: 3 }, 6, 12, [4, 5]);
    expect(o).toMatchObject({ status: 'red', next: { action: 'done' } });
  });
  it('מעל הטווח ברמה הגבוהה ביותר: 🟢 וסיום', () => {
    const o = evaluateTest(ex(), 'horizontalPush', { exerciseId: 'ex-archer-push-up', level: 7, value: 20 }, 6, 12, [7]);
    expect(o).toMatchObject({ status: 'green', next: { action: 'done' } });
  });
  it('חד-צדדי: הצד החלש קובע', () => {
    expect(testValue(10, 7, null, true)).toBe(7);
    expect(testValue(null, 7, null, true)).toBeNull();
    expect(testValue(null, null, 9, false)).toBe(9);
  });
  it('שינויי סטטוס: הנבדק לפי התוצאה, הקלים ממנו 🟢, הקשים לא משתנים', () => {
    const list = ex();
    const ch = familyStatusChanges(list, 'horizontalPush', [
      { exerciseId: 'ex-push-up', level: 4, status: 'green' },
      { exerciseId: 'ex-diamond-push-up', level: 5, status: 'yellow' }
    ]);
    expect(ch['ex-push-up']).toBe('green');
    expect(ch['ex-diamond-push-up']).toBe('yellow');
    expect(ch['ex-wall-push-up']).toBe('green');
    expect(ch['ex-knee-push-up']).toBe('green');
    expect(ch['ex-decline-push-up']).toBeUndefined();
  });
  it('כשהכול 🔴 לא מסמנים קלים', () => {
    const ch = familyStatusChanges(ex(), 'horizontalPush', [{ exerciseId: 'ex-push-up', level: 4, status: 'red' }]);
    expect(ch).toEqual({}); // הוא כבר 🔴
  });
  it('familyReady', () => {
    const list = ex();
    expect(familyReady(list, 'horizontalPush')).toBe(false);
    push('ex-push-up');
    list.find((e) => e.id === 'ex-push-up')!.status = 'yellow';
    expect(familyReady(list, 'horizontalPush')).toBe(true);
  });
});
