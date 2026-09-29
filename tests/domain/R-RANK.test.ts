import { describe, expect, it } from 'vitest';
import { bodyFatToNext, bodyScore, computeRank, levelsReached, levelsToNext, maxLevels, strengthRatio, strengthScore } from '../../src/domain/rules/R-RANK';
import { exercisesWith, session } from './engine-helpers';

describe('R-RANK-1: ציון גוף לפי אחוז שומן', () => {
  it('גברים: 30+ = 1, 25–30 = 2, 20–25 = 3, 15–20 = 4, מתחת ל-15 = 5', () => {
    expect([35, 30, 29.9, 25, 24.9, 20, 19.9, 15, 14.9, 8].map((b) => bodyScore(b, 'male'))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('נשים: 38+ = 1, 33–38 = 2, 28–33 = 3, 23–28 = 4, מתחת ל-23 = 5', () => {
    expect([40, 38, 37.9, 33, 30, 27.9, 22.9].map((b) => bodyScore(b, 'female'))).toEqual([1, 1, 2, 2, 3, 4, 5]);
  });
  it('בלי אחוז שומן או מין: אין ציון', () => {
    expect(bodyScore(null, 'male')).toBeNull();
    expect(bodyScore(25, null)).toBeNull();
  });
  it('R-RANK-5: כמה חסר לציון הבא', () => {
    expect(bodyFatToNext(31.2, 'male')).toBe(1.3);
    expect(bodyFatToNext(30, 'male')).toBe(0.1);
    expect(bodyFatToNext(22, 'male')).toBe(2.1);
    expect(bodyFatToNext(14, 'male')).toBeNull();
  });
});

describe('R-RANK-2: ציון כוח', () => {
  const exs = exercisesWith(2);
  const max = maxLevels(exs);
  it('הרמה הגבוהה בכל סולם (נספח ג׳)', () => {
    expect(max).toEqual({ horizontalPush: 7, verticalPush: 3, verticalPull: 6, horizontalPull: 4, squat: 4, singleLeg: 4, hipHinge: 4 });
  });
  it('ממוצע (רמה ÷ מקסימום), משפחה בלי ביצוע = 0', () => {
    expect(strengthRatio({}, max)).toBe(0);
    const all = { horizontalPush: 7, verticalPush: 3, verticalPull: 6, horizontalPull: 4, squat: 4, singleLeg: 4, hipHinge: 4 };
    expect(strengthRatio(all, max)).toBe(1);
    expect(strengthRatio({ squat: 2, hipHinge: 2 }, max)).toBeCloseTo((0.5 + 0.5) / 7);
  });
  it('גבולות: מתחת ל-0.2 = 1 … מ-0.8 = 5', () => {
    expect([0, 0.19, 0.2, 0.4, 0.59, 0.6, 0.8, 1].map(strengthScore)).toEqual([1, 1, 2, 3, 3, 4, 5, 5]);
  });
  it('מההיסטוריה עד התאריך: סט עבודה נספר, טכניקה לא, מבחן רק 🟡/🟢', () => {
    const h = [
      session('ex-push-up', '2026-10-01', [10], { family: 'horizontalPush', level: 4 }),
      session('ex-archer-push-up', '2026-10-02', [3], { family: 'horizontalPush', level: 7, role: 'technique' }),
      session('ex-pull-up', '2026-10-03', [2], { family: 'verticalPull', level: 5, kind: 'test', statusAtTime: 'red' }),
      session('ex-chin-up', '2026-10-03', [8], { family: 'verticalPull', level: 4, kind: 'test', statusAtTime: 'yellow' }),
      session('ex-shrimp-squat', '2026-12-01', [8], { family: 'singleLeg', level: 4 }),
      session('ex-dead-bug', '2026-10-01', [10], { family: 'coreFront', level: 1 })
    ];
    expect(levelsReached(h, '2026-11-01')).toEqual({ horizontalPush: 4, verticalPull: 4 });
    expect(levelsReached(h, '2026-12-01').singleLeg).toBe(4);
  });
  it('R-RANK-5: המינימום של עליות רמה, קודם בסולם הקצר', () => {
    // מאפס: צריך סכום של 1.4 (0.2 × 7). 3 רמות בדחיקה אנכית (1/3 כל אחת) + 2 בסולם של 4 רמות = 1.5
    const n = levelsToNext({}, max)!;
    expect(strengthRatio({ verticalPush: 3 }, max)).toBeLessThan(0.2);
    expect(n).toBe(5);
    expect(levelsToNext({ horizontalPush: 7, verticalPush: 3, verticalPull: 6, horizontalPull: 4, squat: 4, singleLeg: 4, hipHinge: 4 }, max)).toBeNull();
  });
});

describe('R-RANK-3: דרגה = ממוצע, מעוגל למטה', () => {
  const max = maxLevels(exercisesWith(2));
  it('מתחיל עגלגל: גוף 1, כוח 1 = דרגה 1', () => {
    expect(computeRank(33, 'male', {}, max)).toMatchObject({ body: 1, strength: 1, rank: 1, name: 'מתחיל', bodyFatToNext: 3.1 });
  });
  it('גוף 3, כוח 2 = דרגה 2 (2.5 למטה)', () => {
    const levels = { horizontalPush: 4, verticalPush: 1, verticalPull: 3, horizontalPull: 2, squat: 1, singleLeg: 1, hipHinge: 1 };
    const r = computeRank(22, 'male', levels, max);
    expect(r.body).toBe(3);
    expect(r.strength).toBe(strengthScore(strengthRatio(levels, max)));
    expect(r.rank).toBe(Math.floor((3 + r.strength) / 2));
  });
  it('בלי מדידה: אין דרגה, אבל יש ציון כוח', () => {
    const r = computeRank(null, null, { squat: 4 }, max);
    expect(r.rank).toBeNull();
    expect(r.strength).toBe(1);
  });
});
