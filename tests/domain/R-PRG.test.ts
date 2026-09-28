import { describe, expect, it } from 'vitest';
import { evaluate, progressionSuggestions, targetToday, type LadderInfo } from '../../src/domain/rules/R-PRG';
import { exercisesWith, session } from './engine-helpers';
import type { Exercise } from '../../src/domain/types';

const all = exercisesWith(3);
const ex = (id: string, p: Partial<Exercise> = {}): Exercise => ({ ...all.find((e) => e.id === id)!, ...p });
const pushUp = ex('ex-push-up', { status: 'yellow' });
const diamond = ex('ex-diamond-push-up', { status: 'red' });
const knee = ex('ex-knee-push-up', { status: 'green' });
const lad = (nextAvail = true): LadderInfo => ({ next: [{ ex: diamond, availableSomewhere: nextAvail }], previous: knee });

describe('✅ בדיקת קבלה: כללי ההתקדמות עוברים תרחישים מוגדרים (R-PRG)', () => {
  it('R-PRG-1: הושג / לא הושג / בטווח', () => {
    expect(evaluate(pushUp, session('x', 'd', [12, 12, 12]))).toBe('achieved');
    expect(evaluate(pushUp, session('x', 'd', [12, 12, 12], { rpe: 9 }))).toBe('inRange');
    expect(evaluate(pushUp, session('x', 'd', [12, 12, 5]))).toBe('missed');
    expect(evaluate(pushUp, session('x', 'd', [8, 9, 10]))).toBe('inRange');
  });
  it('R-PRG-1: חד-צדדי לפי הצד החלש', () => {
    const archer = ex('ex-archer-push-up');
    expect(evaluate(archer, session('x', 'd', [12, 12], { left: [12, 11] }))).toBe('inRange');
    expect(evaluate(archer, session('x', 'd', [12, 12], { left: [12, 12] }))).toBe('achieved');
  });
  it('R-PRG-2 + R-GEN-6: +1 חזרה מהסט החלש, עד הקצה העליון', () => {
    expect(targetToday(pushUp, session('x', 'd', [9, 8, 8]), 3)).toMatchObject({ value: 9, text: '3×9' });
    expect(targetToday(pushUp, session('x', 'd', [12, 12, 12]), 3).value).toBe(12);
    expect(targetToday(pushUp, session('x', 'd', [4, 4, 4]), 3).value).toBe(6);
    expect(targetToday(pushUp, null, 3).value).toBe(6);
    expect(targetToday(pushUp, session('x', 'd', [11], { kind: 'test' }), 3).value).toBe(6);
  });
  it('R-PRG-2: בזמן +5 שניות', () => {
    const plank = ex('ex-plank');
    expect(targetToday(plank, session('x', 'd', [40, 35]), 2)).toMatchObject({ value: 40, text: "2×40שנ'" });
  });
  it('R-PRG-3: הושג פעמיים ברציפות → הצעה לעבור לרמה הבאה', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [12, 12, 12]), session('x', '2026-10-03', [12, 12, 12])], lad());
    expect(s.map((x) => x.type)).toEqual(['advance']);
    expect(s[0].payload.nextId).toBe('ex-diamond-push-up');
  });
  it('R-PRG-3: פעם אחת לא מספיק', () => {
    expect(progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [10, 10, 10]), session('x', '2026-10-03', [12, 12, 12])], lad())).toEqual([]);
  });
  it('R-PRG-3 (סוף): באימון הראשון ברמה החדשה הסט הראשון מתחת לתחתון → חזרה', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [4, 5, 5])], lad());
    expect(s[0]).toMatchObject({ type: 'regress', payload: { previousId: 'ex-knee-push-up' } });
  });
  it('R-PRG-4: הושג אבל הרמה הבאה לא זמינה בציוד → קצב איטי', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [12, 12, 12]), session('x', '2026-10-03', [12, 12, 12])], lad(false));
    expect(s.map((x) => x.type)).toEqual(['tempo']);
  });
  it('R-PRG-5: אין רמה הבאה → עומס חיצוני', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [12, 12, 12]), session('x', '2026-10-03', [12, 12, 12])], { next: [], previous: knee });
    expect(s.map((x) => x.type)).toEqual(['load']);
  });
  it('R-PRG-7: לא הושג פעמיים ברציפות → להישאר או לחזור', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [8, 8, 8]), session('x', '2026-10-03', [5, 5, 5]), session('x', '2026-10-05', [5, 4, 4])], lad());
    expect(s.map((x) => x.type)).toEqual(['stayOrEasier']);
  });
  it('R-PRG-8: 🟡 שהושג שלוש פעמים ברציפות → הצעה ל-🟢', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', ['01', '03', '05'].map((d) => session('x', `2026-10-${d}`, [12, 12, 12])), lad());
    expect(s.map((x) => x.type).sort()).toEqual(['advance', 'promote']);
  });
  it('R-PRG-9: אימוני הורדת עומס לא נספרים ל"ברציפות"', () => {
    const s = progressionSuggestions(pushUp, 'horizontalPush', [session('x', '2026-10-01', [12, 12, 12]), session('x', '2026-10-03', [12, 12, 12], { isDeload: true })], lad());
    expect(s).toEqual([]);
  });
});
