import { describe, expect, it } from 'vitest';
import { buildSeedExercises } from '../../src/data/seed/exercises';
import type { Exercise } from '../../src/domain/types';
import { ladder, levelIn } from '../../src/domain/calc/exercises';
import { STRENGTH_FAMILIES, FAMILY_META } from '../../src/domain/families';
import {
  chooseExercise, currentFamily, defaultSelection, isValidSession, nextFamily, recordSet, sessionChanges, sessionDone,
  startSession, suggestStart, swapOptions, testOrder, undoLastSet, REST_IN_FAMILY_SEC, REST_BETWEEN_FAMILIES_SEC, type TestSession
} from '../../src/domain/rules/R-TST';

const ex = (): Exercise[] => buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));
const all = () => true;
const NOW = 1_000_000;
const ok = (r: TestSession | { error: string }) => {
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('R-TST-2: סדר לסירוגין לפי קטגוריה', () => {
  it('דחיקה, משיכה, רגליים, ליבה וחוזר חלילה', () => {
    const o = testOrder(STRENGTH_FAMILIES);
    expect(o).toHaveLength(STRENGTH_FAMILIES.length);
    expect(new Set(o)).toEqual(new Set(STRENGTH_FAMILIES));
    expect(o.slice(0, 4).map((f) => FAMILY_META[f].category)).toEqual(['push', 'pull', 'legs', 'core']);
    expect(o[0]).toBe('horizontalPush');
    // אין שתי משפחות צמודות מאותה קטגוריה כל עוד יש ממה לבחור
    expect(o.slice(0, 8).every((f, i, a) => i === 0 || FAMILY_META[f].category !== FAMILY_META[a[i - 1]].category)).toBe(true);
  });
});

describe('R-TST-1: ברירת מחדל לבחירה', () => {
  it('רק משפחות שלא נבדקו ושיש בהן תרגיל זמין', () => {
    const exs = ex();
    const pu = exs.find((e) => e.id === 'ex-push-up')!;
    pu.status = 'yellow';
    const sel = defaultSelection(exs, STRENGTH_FAMILIES, (e) => !e.families.some((f) => f.family === 'verticalPull'));
    expect(sel).not.toContain('horizontalPush');
    expect(sel).not.toContain('verticalPull');
    expect(sel).toContain('squat');
  });
});

describe('R-TST-3 / R-TST-8: הרמה הראשונה המוצעת', () => {
  it('בלי סטטוס: הקלה ביותר שזמינה', () => {
    const exs = ex();
    const lad = ladder(exs, 'horizontalPush');
    expect(suggestStart(exs, 'horizontalPush', all, false)!.id).toBe(lad[0].id);
    expect(suggestStart(exs, 'horizontalPush', (e) => e.id !== lad[0].id, false)!.id).not.toBe(lad[0].id);
  });
  it('🟡 קודם, אחרת הרמה שאחרי ה-🟢 הגבוה', () => {
    const exs = ex();
    exs.find((e) => e.id === 'ex-incline-push-up')!.status = 'green';
    const s = suggestStart(exs, 'horizontalPush', all, false)!;
    expect(levelIn(s, 'horizontalPush')).toBeGreaterThan(levelIn(exs.find((e) => e.id === 'ex-incline-push-up')!, 'horizontalPush')!);
    exs.find((e) => e.id === 'ex-push-up')!.status = 'yellow';
    expect(suggestStart(exs, 'horizontalPush', all, false)!.id).toBe('ex-push-up');
  });
  it('ביסודות תמיד הקלה ביותר', () => {
    const exs = ex();
    exs.find((e) => e.id === 'ex-push-up')!.status = 'yellow';
    expect(suggestStart(exs, 'horizontalPush', all, true)!.id).toBe(ladder(exs, 'horizontalPush')[0].id);
  });
  it('אין תרגיל זמין ← null', () => {
    expect(suggestStart(ex(), 'horizontalPush', () => false, false)).toBeNull();
  });
});

describe('R-TST-4: אחרי סט', () => {
  const start = (exs: Exercise[]) => chooseExercise(startSession({ exercises: exs, families: ['horizontalPush', 'squat'], location: 'outdoor', foundation: false, usable: all, now: NOW }), 'ex-push-up');

  it('מעל הטווח ← הרמה הבאה מוכנה ומנוחה של 2 דקות', () => {
    const exs = ex();
    const s = ok(recordSet(start(exs), exs, all, { value: 20, right: null, left: null }, NOW));
    expect(s.phase).toBe('test');
    expect(levelIn(exs.find((e) => e.id === s.current)!, 'horizontalPush')).toBe(5);
    expect(s.restEndsAt).toBe(NOW + REST_IN_FAMILY_SEC * 1000);
    expect(s.sets[0]).toMatchObject({ exerciseId: 'ex-push-up', status: 'green', value: 20 });
  });
  it('בתוך הטווח ← סיכום המשפחה', () => {
    const exs = ex();
    const s = ok(recordSet(start(exs), exs, all, { value: 8, right: null, left: null }, NOW));
    expect(s.phase).toBe('review');
    expect(s.current).toBeNull();
    expect(sessionChanges(s, exs)['ex-push-up']).toBe('yellow');
  });
  it('הרמה הבאה לא זמינה ← מדלגים לקרובה שזמינה באותו כיוון', () => {
    const exs = ex();
    const up = ok(recordSet(start(exs), exs, (e) => levelIn(e, 'horizontalPush') !== 5, { value: 20, right: null, left: null }, NOW));
    expect(up.phase).toBe('test');
    expect(levelIn(exs.find((e) => e.id === up.current)!, 'horizontalPush')).toBe(6);
    const down = ok(recordSet(start(exs), exs, (e) => levelIn(e, 'horizontalPush') !== 3, { value: 1, right: null, left: null }, NOW));
    expect(levelIn(exs.find((e) => e.id === down.current)!, 'horizontalPush')).toBe(2);
  });
  it('אין אף רמה זמינה באותו כיוון ← סיכום עם הסבר', () => {
    const exs = ex();
    const s = ok(recordSet(start(exs), exs, (e) => levelIn(e, 'horizontalPush')! <= 4, { value: 20, right: null, left: null }, NOW));
    expect(s.phase).toBe('review');
    expect(s.nextUnavailable).toBe(true);
  });
  it('תוצאה חסרה ← שגיאה, בחד-צדדי צריך שני צדדים', () => {
    const exs = ex();
    expect(recordSet(start(exs), exs, all, { value: null, right: null, left: null }, NOW)).toEqual({ error: 'הזן תוצאה' });
    const uni = exs.find((e) => e.unilateral && e.families.length)!;
    const fam = uni.families[0].family as never;
    const s = chooseExercise(startSession({ exercises: exs, families: [fam], location: 'outdoor', foundation: false, usable: all, now: NOW }), uni.id);
    expect(recordSet(s, exs, all, { value: null, right: 5, left: null }, NOW)).toEqual({ error: 'הזן תוצאה לשני הצדדים' });
    const r = ok(recordSet(s, exs, all, { value: null, right: 9, left: 3 }, NOW));
    expect(r.sets[0]).toMatchObject({ right: 9, left: 3, value: null });
  });
  it('מחק סט אחרון ← חוזרים לאותו תרגיל', () => {
    const exs = ex();
    const s = ok(recordSet(start(exs), exs, all, { value: 20, right: null, left: null }, NOW));
    const u = undoLastSet(s);
    expect(u.sets).toHaveLength(0);
    expect(u.current).toBe('ex-push-up');
    expect(u.restEndsAt).toBeNull();
  });
  it('החלף תרגיל: לפני הסט הראשון כל הסולם, אחר כך רק אותה רמה', () => {
    const exs = ex();
    const s0 = start(exs);
    expect(swapOptions(s0, exs)).toHaveLength(ladder(exs, 'horizontalPush').length);
    const s1 = ok(recordSet(s0, exs, all, { value: 20, right: null, left: null }, NOW));
    expect(swapOptions(s1, exs).every((e) => levelIn(e, 'horizontalPush') === 5)).toBe(true);
  });
});

describe('R-TST-5: מעבר בין משפחות', () => {
  it('אישור ← המשפחה הבאה מוכנה, מנוחה של דקה; בסוף המבחן הסתיים', () => {
    const exs = ex();
    let s = chooseExercise(startSession({ exercises: exs, families: ['squat', 'horizontalPush'], location: 'outdoor', foundation: false, usable: all, now: NOW }), 'ex-push-up');
    expect(currentFamily(s)).toBe('horizontalPush');
    s = ok(recordSet(s, exs, all, { value: 8, right: null, left: null }, NOW));
    s = nextFamily(s, exs, all, true, NOW);
    expect(currentFamily(s)).toBe('squat');
    expect(s.confirmed).toEqual(['horizontalPush']);
    expect(s.sets).toHaveLength(0);
    expect(s.current).toBe(ladder(exs, 'squat')[0].id);
    expect(s.restEndsAt).toBe(NOW + REST_BETWEEN_FAMILIES_SEC * 1000);
    s = nextFamily(s, exs, all, false, NOW);
    expect(s.skipped).toEqual(['squat']);
    expect(sessionDone(s)).toBe(true);
    expect(currentFamily(s)).toBeNull();
  });
});

describe('R-TST-6: מצב שמור תקין', () => {
  it('תרגיל שנמחק או גרסה אחרת ← לא תקין', () => {
    const exs = ex();
    const s = startSession({ exercises: exs, families: ['squat'], location: 'outdoor', foundation: false, usable: all, now: NOW });
    expect(isValidSession(s, exs)).toBe(true);
    expect(isValidSession({ ...s, v: 2 }, exs)).toBe(false);
    expect(isValidSession({ ...s, current: 'gone' }, exs)).toBe(false);
    expect(isValidSession(null, exs)).toBe(false);
  });
});
