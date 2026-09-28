import { describe, expect, it } from 'vitest';
import { buildWorkout, STRENGTH_LIMIT_SEC, TOTAL_LIMIT_SEC, type BuildInput } from '../../src/domain/engine/buildWorkout';
import { everything, exercisesWith, home, outdoor, templates, tpl } from './engine-helpers';
import type { Injury } from '../../src/domain/types';

const input = (p: Partial<BuildInput>): BuildInput => ({
  date: '2026-10-04', plan: { dayType: 'training', templateId: 'tpl-push' }, template: tpl('tpl-push'), exercises: exercisesWith(2), injuries: [],
  location: everything, history: [], isDeload: false, lowRecoveryDeclined: false, healedReturns: [], ...p
});

describe('✅ בדיקת קבלה: אימון לא עובר 60 דקות כוח ו-90 דקות סה"כ', () => {
  for (const t of templates.filter((x) => x.kind === 'training')) {
    for (const lvl of [1, 2, 3, 5, 7]) {
      for (const loc of [home, outdoor, everything]) {
        it(`${t.name} · רמה ${lvl} · ${loc.name}`, () => {
          const w = buildWorkout(input({ template: t, plan: { dayType: 'training', templateId: t.id }, exercises: exercisesWith(lvl), location: loc }));
          expect(w.strengthSec).toBeLessThanOrEqual(STRENGTH_LIMIT_SEC);
          expect(w.totalSec).toBeLessThanOrEqual(TOTAL_LIMIT_SEC);
          const extra = w.blocks.reduce((a, b) => a + b.minutes, 0);
          expect(extra).toBeLessThanOrEqual(30);
          expect(w.blocks[0].key).toBe('warmup');
        });
      }
    }
  }
  it('גם כשכל סט ארוך במיוחד, הכוח נחתך ל-60 דקות (R-GEN-5)', () => {
    const exs = exercisesWith(2).map((e) => ({ ...e, secondsPerSet: 240, restSec: 240 }));
    const w = buildWorkout(input({ exercises: exs }));
    expect(w.strengthSec).toBeLessThanOrEqual(STRENGTH_LIMIT_SEC);
    for (const it of w.strength.filter((i) => i.priority === 'main')) expect(it.sets).toBeGreaterThanOrEqual(2);
  });
});

describe('R-GEN-1 בחירת תרגיל', () => {
  it('הרמה הגבוהה ביותר ב-🟢/🟡', () => {
    const w = buildWorkout(input({}));
    const hp = w.strength.find((i) => i.family === 'horizontalPush' && i.role === 'work')!;
    expect(hp.exercise.name).toBe('Knee Push-up'); // רמה 3 = 🟡
  });
  it('אותו תרגיל לא פעמיים באימון (Diamond Push-up בשתי משפחות)', () => {
    const exs = exercisesWith(2).map((e) => (e.id === 'ex-diamond-push-up' ? { ...e, status: 'yellow' as const } : e.id === 'ex-db-overhead-extension' ? { ...e, status: 'red' as const } : e));
    const w = buildWorkout(input({ exercises: exs }));
    const ids = w.strength.map((i) => i.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('בבית בלי מוט: משיכה אנכית מוחלפת או מדלגת עם סיבה (R-GEN-1א)', () => {
    const w = buildWorkout(input({ template: tpl('tpl-pull'), plan: { dayType: 'training', templateId: 'tpl-pull' }, location: home }));
    const vp = w.strength.find((i) => i.family === 'verticalPull');
    if (vp) expect(vp.substituteFor).toBeTruthy();
    else expect(w.skipped.some((s) => s.family === 'משיכה אנכית')).toBe(true);
    expect(w.strength.find((i) => i.family === 'horizontalPull')?.exercise.name).toBe('Dumbbell Row');
  });
  it('פציעה חוסמת: תחליף לאותו שריר או דילוג עם סיבה (R-INJ-1, R-INJ-2)', () => {
    const inj: Injury = { id: 'i', createdAt: '', updatedAt: '', deletedAt: null, area: 'knee', pain: 5, status: 'active', startDate: '2026-10-01', healedDate: null, notes: '', blockedExercises: [], blockedFamilies: ['squat', 'singleLeg'], blockedMuscles: ['quads'] };
    const w = buildWorkout(input({ template: tpl('tpl-legs-core'), plan: { dayType: 'training', templateId: 'tpl-legs-core' }, injuries: [inj] }));
    for (const it of w.strength) expect(it.exercise.primaryMuscles).not.toContain('quads');
    const squat = w.strength.find((i) => i.family === 'squat');
    if (squat) expect(squat.substituteFor).toBe('סקוואט');
    else expect(w.skipped.map((s) => s.family)).toContain('סקוואט');
  });
  it('בלי מבחן פתיחה: אין אימון, והסיבה מוצגת', () => {
    const w = buildWorkout(input({ exercises: exercisesWith(0).map((e) => (e.status ? { ...e, status: 'red' as const } : e)) }));
    expect(w.strength).toEqual([]);
    expect(w.skipped[0].reason).toContain('מבחן פתיחה');
  });
});

describe('שינויים לפי מצב', () => {
  it('הורדת עומס: חצי מהסטים (מעוגל למעלה), RPE 6–7, בלי טכניקה (R-DL-2)', () => {
    const w = buildWorkout(input({ isDeload: true }));
    const main = w.strength.find((i) => i.priority === 'main')!;
    expect(main.sets).toBe(2);
    expect(main.rpeTarget).toBe('6–7');
    expect(w.strength.some((i) => i.role === 'technique')).toBe(false);
    expect(w.blocks.find((b) => b.key === 'stretch')!.minutes).toBe(10);
  });
  it('התאוששות נמוכה שנדחתה: 2 סטים ו-RPE 7 (R-REC-2)', () => {
    const w = buildWorkout(input({ lowRecoveryDeclined: true }));
    for (const i of w.strength.filter((x) => x.role === 'work')) expect([i.sets, i.rpeTarget]).toEqual([2, '7']);
  });
  it('הורדת עומס גוברת על התאוששות נמוכה (E4)', () => {
    const w = buildWorkout(input({ lowRecoveryDeclined: true, isDeload: true }));
    expect(w.strength[0].rpeTarget).toBe('6–7');
  });
  it('חזרה אחרי פציעה: באימון הראשון חצי מהסטים ו-RPE 6, בשני מלא (R-INJ-3)', () => {
    const inj: Injury = { id: 'i', createdAt: '', updatedAt: '', deletedAt: null, area: 'shoulder', pain: 2, status: 'healed', startDate: '2026-09-01', healedDate: '2026-10-01', notes: '', blockedExercises: [], blockedFamilies: ['verticalPush'], blockedMuscles: [] };
    const w1 = buildWorkout(input({ healedReturns: [{ injury: inj, workoutNumber: 1 }] }));
    const vp1 = w1.strength.find((i) => i.family === 'verticalPush')!;
    expect([vp1.sets, vp1.rpeTarget]).toEqual([2, '6']);
    const w2 = buildWorkout(input({ healedReturns: [{ injury: inj, workoutNumber: 2 }] }));
    expect(w2.strength.find((i) => i.family === 'verticalPush')!.sets).toBe(3);
  });
  it('עבודת טכניקה ל-🔴 מעל הרמה שנבחרה, מסומנת (R-GEN-2)', () => {
    const w = buildWorkout(input({}));
    const tech = w.strength.filter((i) => i.role === 'technique');
    expect(tech.length).toBeGreaterThan(0);
    expect(tech[0].rpeTarget).toBe('עד 6');
  });
  it('יום התאוששות פעילה: אפס כוח, עד 60 דקות (R-DAY-2)', () => {
    const w = buildWorkout(input({ plan: { dayType: 'activeRecovery', templateId: 'tpl-recovery' }, template: tpl('tpl-recovery') }));
    expect(w.strength).toEqual([]);
    expect(w.totalSec).toBeLessThanOrEqual(60 * 60);
  });
  it('שבת: אין אימון (R-DAY-3)', () => {
    const w = buildWorkout(input({ plan: { dayType: 'rest', templateId: null }, template: null }));
    expect(w.strength).toEqual([]);
    expect(w.blocks).toEqual([]);
  });
});
