import { describe, expect, it } from 'vitest';
import { buildSeedExercises } from '../../src/data/seed/exercises';
import type { Exercise } from '../../src/domain/types';
import { ladder, levelIn } from '../../src/domain/calc/exercises';
import { STRENGTH_FAMILIES, FAMILY_META } from '../../src/domain/families';
import { defaultSelection, suggestStart, testOrder, testStep, testWarmup } from '../../src/domain/rules/R-TST';

const ex = (): Exercise[] => buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));
const all = () => true;
const byId = (exs: Exercise[], id: string) => exs.find((e) => e.id === id)!;
const lvl = (e: Exercise | null) => (e ? levelIn(e, 'horizontalPush') : null);

describe('R-TST-2: סדר לסירוגין לפי קטגוריה', () => {
  it('דחיקה, משיכה, רגליים, ליבה וחוזר חלילה', () => {
    const o = testOrder(STRENGTH_FAMILIES);
    expect(o).toHaveLength(STRENGTH_FAMILIES.length);
    expect(new Set(o)).toEqual(new Set(STRENGTH_FAMILIES));
    expect(o.slice(0, 4).map((f) => FAMILY_META[f].category)).toEqual(['push', 'pull', 'legs', 'core']);
    expect(o[0]).toBe('horizontalPush');
    expect(o.slice(0, 8).every((f, i, a) => i === 0 || FAMILY_META[f].category !== FAMILY_META[a[i - 1]].category)).toBe(true);
  });
});

describe('R-TST-1: ברירת מחדל לבחירה', () => {
  it('רק משפחות שלא נבדקו ושיש בהן תרגיל זמין', () => {
    const exs = ex();
    byId(exs, 'ex-push-up').status = 'yellow';
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
    byId(exs, 'ex-incline-push-up').status = 'green';
    expect(lvl(suggestStart(exs, 'horizontalPush', all, false))).toBeGreaterThan(lvl(byId(exs, 'ex-incline-push-up'))!);
    byId(exs, 'ex-push-up').status = 'yellow';
    expect(suggestStart(exs, 'horizontalPush', all, false)!.id).toBe('ex-push-up');
  });
  it('ביסודות תמיד הקלה ביותר; אין תרגיל זמין ← null', () => {
    const exs = ex();
    byId(exs, 'ex-push-up').status = 'yellow';
    expect(suggestStart(exs, 'horizontalPush', all, true)!.id).toBe(ladder(exs, 'horizontalPush')[0].id);
    expect(suggestStart(exs, 'horizontalPush', () => false, false)).toBeNull();
  });
});

describe('R-TST-4: חימום', () => {
  it('תרגילי מוביליטי זמינים וסט קל מהתרגיל הראשון', () => {
    const exs = ex();
    const b = testWarmup(exs, all, byId(exs, 'ex-push-up'));
    expect(b.key).toBe('warmup');
    expect(b.items.length).toBeGreaterThan(1);
    expect(b.items[b.items.length - 1].exerciseId).toBe('ex-push-up');
  });
});

describe('R-TST-5: אחרי סט', () => {
  const pu = (exs: Exercise[]) => byId(exs, 'ex-push-up');
  it('מעל הטווח ← הרמה הבאה', () => {
    const exs = ex();
    const s = testStep(exs, 'horizontalPush', pu(exs), 20, [], all);
    expect(s.status).toBe('green');
    expect(lvl(s.next)).toBe(5);
  });
  it('בתוך הטווח ← המשפחה הסתיימה', () => {
    const exs = ex();
    const s = testStep(exs, 'horizontalPush', pu(exs), 8, [], all);
    expect(s).toMatchObject({ status: 'yellow', next: null, nextUnavailable: false });
  });
  it('מתחת לטווח ← הרמה הקלה יותר', () => {
    const exs = ex();
    expect(lvl(testStep(exs, 'horizontalPush', pu(exs), 2, [], all).next)).toBe(3);
  });
  it('לא חוזרים לרמה שנבדקה', () => {
    const exs = ex();
    const s = testStep(exs, 'horizontalPush', pu(exs), 2, [{ exerciseId: 'ex-knee-push-up', level: 3 }], all);
    expect(s.next).toBeNull();
  });
  it('רמה לא זמינה ← מדלגים לקרובה שזמינה באותו כיוון', () => {
    const exs = ex();
    expect(lvl(testStep(exs, 'horizontalPush', pu(exs), 20, [], (e) => lvl(e) !== 5).next)).toBe(6);
    expect(lvl(testStep(exs, 'horizontalPush', pu(exs), 1, [], (e) => lvl(e) !== 3).next)).toBe(2);
  });
  it('אין אף רמה זמינה באותו כיוון ← סיום עם הסבר', () => {
    const exs = ex();
    const s = testStep(exs, 'horizontalPush', pu(exs), 20, [], (e) => lvl(e)! <= 4);
    expect(s.next).toBeNull();
    expect(s.nextUnavailable).toBe(true);
    expect(s.message).toContain('לא זמינה');
  });
});
