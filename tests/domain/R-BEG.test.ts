import { describe, expect, it } from 'vitest';
import { calibrationSuggestion, deloadProgramStart, foundationStartChanges, foundationStartDate, FOUNDATION_FAMILIES, FOUNDATION_STRENGTH_LIMIT_SEC, FOUNDATION_TOTAL_LIMIT_SEC, foundationDue, foundationOn, foundationSets, pendingFoundation, remainingTestFamilies } from '../../src/domain/rules/R-BEG';
import { buildWorkout, type BuildInput } from '../../src/domain/engine/buildWorkout';
import { FOUNDATION_WEEK_DAYS } from '../../src/domain/rules/R-DAY';
import { STRENGTH_FAMILIES } from '../../src/domain/families';
import type { WeekPlanVersion } from '../../src/domain/types';
import { everything, exercisesWith, home, outdoor, session, tpl } from './engine-helpers';
import { buildSeedExercises } from '../../src/data/seed/exercises';

const v = (effectiveFrom: string, program: WeekPlanVersion['program']): WeekPlanVersion =>
  ({ id: effectiveFrom, createdAt: '', updatedAt: '', deletedAt: null, effectiveFrom, days: FOUNDATION_WEEK_DAYS, program });

describe('R-BEG: באיזה שבוע של תוכנית היסודות', () => {
  const versions = [v('2026-09-27', undefined), v('2026-10-04', 'foundation'), v('2026-11-15', 'regular')];
  it('לפני ההתחלה ואחרי המעבר: לא ביסודות', () => {
    expect(foundationOn(versions, '2026-10-03')).toBeNull();
    expect(foundationOn(versions, '2026-11-15')).toBeNull();
  });
  it('שבוע 1 מיום ראשון, שבוע 2 אחרי שבוע, שבוע 6 בסוף', () => {
    expect(foundationOn(versions, '2026-10-04')).toEqual({ start: '2026-10-04', week: 1 });
    expect(foundationOn(versions, '2026-10-10')?.week).toBe(1);
    expect(foundationOn(versions, '2026-10-11')?.week).toBe(2);
    expect(foundationOn(versions, '2026-11-14')?.week).toBe(6);
  });
  it('R-BEG-2 (2.8): התחלה באמצע השבוע, השבועות נספרים מיום ההתחלה', () => {
    const mid = [v('2026-09-27', undefined), v('2026-09-29', 'foundation')];
    expect(foundationOn(mid, '2026-09-29')).toEqual({ start: '2026-09-29', week: 1 });
    expect(foundationOn(mid, '2026-10-05')?.week).toBe(1);
    expect(foundationOn(mid, '2026-10-06')?.week).toBe(2);
    expect(foundationOn(mid, '2026-11-09')?.week).toBe(6); // יום 41
    expect(foundationOn(mid, '2026-11-10')?.week).toBe(7); // יום 42
    expect(foundationStartDate([v('2026-09-27', undefined)], '2026-09-29')).toBe('2026-09-29');
    expect(foundationStartDate(mid, '2026-12-01')).toBeNull();
  });
  it('עריכה של התוכנית באמצע (גרסת יסודות נוספת) לא מאפסת את הספירה', () => {
    const edited = [...versions.slice(0, 2), v('2026-10-18', 'foundation')];
    expect(foundationOn(edited, '2026-10-20')).toEqual({ start: '2026-10-04', week: 3 });
  });
  it('גרסה שנקבעה לעתיד', () => {
    expect(pendingFoundation(versions, '2026-09-29')?.effectiveFrom).toBe('2026-10-04');
    expect(pendingFoundation(versions, '2026-10-04')).toBeNull();
  });
  it('R-BEG-6: הצעת המעבר מהשבוע השישי', () => {
    expect(foundationDue({ start: '2026-10-04', week: 5 })).toBe(false);
    expect(foundationDue({ start: '2026-10-04', week: 6 })).toBe(true);
    expect(foundationDue(null)).toBe(false);
  });
  it('R-BEG-6: 6 המשפחות שנבדקות בסוף', () => {
    expect(FOUNDATION_FAMILIES).toHaveLength(11);
    expect(remainingTestFamilies(STRENGTH_FAMILIES).sort()).toEqual(['biceps', 'dips', 'grip', 'hamstring', 'scapula', 'triceps']);
  });
});

describe('R-BEG-4: סטים', () => {
  it('שבועות 1–2: 2 סטים ו-RPE 6–7. משבוע 3: לפי התבנית', () => {
    expect(foundationSets(3, 1)).toEqual({ sets: 2, rpeTarget: '6–7' });
    expect(foundationSets(3, 2)).toEqual({ sets: 2, rpeTarget: '6–7' });
    expect(foundationSets(3, 3)).toEqual({ sets: 3, rpeTarget: null });
    expect(foundationSets(2, 5)).toEqual({ sets: 2, rpeTarget: null });
  });
});

describe('R-BEG-5 + R-DL-1: ספירת הורדת העומס מתחילה אחרי היסודות', () => {
  const versions = [v('2026-09-27', undefined), v('2026-10-04', 'foundation'), v('2026-11-15', 'regular')];
  it('אימונים לפני היסודות ובתוכם לא נספרים', () => {
    expect(deloadProgramStart(['2026-09-30', '2026-10-05', '2026-11-12'], versions)).toBeNull();
    expect(deloadProgramStart(['2026-09-30', '2026-10-05', '2026-11-17'], versions)).toBe('2026-11-15');
  });
  it('בלי יסודות: כמו קודם, מהאימון הראשון', () => {
    expect(deloadProgramStart(['2026-10-01'], [v('2026-09-27', undefined)])).toBe('2026-09-27');
  });
});

const input = (p: Partial<BuildInput>): BuildInput => ({
  date: '2026-10-04', plan: { dayType: 'training', templateId: 'tpl-found-upper' }, template: tpl('tpl-found-upper'), exercises: exercisesWith(0), injuries: [],
  location: home, history: [], isDeload: false, lowRecoveryDeclined: false, healedReturns: [], foundationWeek: 1, ...p
});

describe('✅ בדיקת קבלה 9א: אימון יסודות עד 60 דקות, כוח עד 30, עם כושר בלי קפיצות', () => {
  for (const id of ['tpl-found-upper', 'tpl-found-lower']) {
    for (const lvl of [-1, 0, 1, 2, 4]) {
      for (const loc of [home, outdoor, everything]) {
        for (const week of [1, 3, 6]) {
          it(`${id} · רמה ${lvl} · ${loc.id}/${loc.name} · שבוע ${week}`, () => {
            const w = buildWorkout(input({ template: tpl(id), plan: { dayType: 'training', templateId: id }, exercises: exercisesWith(lvl), location: loc, foundationWeek: week }));
            expect(w.strength.length).toBeGreaterThan(0);
            expect(w.strengthSec).toBeLessThanOrEqual(FOUNDATION_STRENGTH_LIMIT_SEC);
            expect(w.totalSec).toBeLessThanOrEqual(FOUNDATION_TOTAL_LIMIT_SEC);
            expect(w.strengthLimitSec).toBe(FOUNDATION_STRENGTH_LIMIT_SEC);
            expect(w.blocks.map((b) => b.key)).toEqual(['warmup', 'cardio', 'stretch', 'posture', 'jaw', 'meditation']);
            const cardio = w.blocks.find((b) => b.key === 'cardio')!;
            expect(cardio.minutes).toBe(8);
            expect(cardio.items.length).toBeGreaterThan(0);
            // "בלי קפיצות": רק ממשפחת הכושר, שכולה בלי קפיצות
            const byId = new Map(exercisesWith(lvl).map((e) => [e.id, e]));
            for (const it of cardio.items) expect(byId.get(it.exerciseId!)!.familyIds).toEqual(['cardio']);
          });
        }
      }
    }
  }
  it('שבוע 1: כל סט עבודה 2 סטים, RPE 6–7. שבוע 3: ראשי 3', () => {
    const w1 = buildWorkout(input({}));
    for (const it of w1.strength.filter((i) => i.role === 'work')) {
      expect(it.sets).toBe(2);
      expect(it.rpeTarget).toBe('6–7');
    }
    const w3 = buildWorkout(input({ foundationWeek: 3 }));
    expect(w3.strength.filter((i) => i.priority === 'main').every((i) => i.sets === 3)).toBe(true);
  });
  it('רמה 0 נבחרת כשרק היא 🟢/🟡 (מתחיל מאפס)', () => {
    const w = buildWorkout(input({ exercises: exercisesWith(-1), template: tpl('tpl-found-lower'), plan: { dayType: 'training', templateId: 'tpl-found-lower' } }));
    const squat = w.strength.find((i) => i.family === 'squat')!;
    expect(squat.exercise.families.find((f) => f.family === 'squat')!.level).toBe(0);
  });
});

describe('R-BEG-4: יום הליכה ומוביליטי', () => {
  it('הליכה מהירה, מוביליטי ומתיחות. בלי כוח, 45 דקות', () => {
    const w = buildWorkout(input({ plan: { dayType: 'activeRecovery', templateId: 'tpl-walk' }, template: tpl('tpl-walk') }));
    expect(w.strength).toHaveLength(0);
    expect(w.blocks.map((b) => b.key)).toEqual(['cardio', 'mobility', 'stretch']);
    expect(w.blocks[0].items[0].name).toBe('Brisk Walk');
    expect(w.totalSec).toBe(45 * 60);
  });
  it('יום התאוששות רגיל לא השתנה', () => {
    const w = buildWorkout(input({ plan: { dayType: 'activeRecovery', templateId: 'tpl-recovery' }, template: tpl('tpl-recovery'), foundationWeek: null }));
    expect(w.blocks.map((b) => b.key)).toEqual(['mobility', 'stretch', 'posture', 'jaw', 'meditation']);
  });
});

describe('R-BEG-2 (2.9): תרגילי התחלה בלי מבחן', () => {
  const fresh = () => buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));
  it('הרמה הקלה ביותר בסולם, ובכל מיקום הקלה שזמינה בו', () => {
    const ch = foundationStartChanges(fresh(), [home, outdoor]);
    expect(Object.keys(ch).sort()).toEqual([
      'ex-bird-dog', 'ex-calf-raise', 'ex-chair-squat', 'ex-doorway-row', 'ex-glute-bridge', 'ex-incline-pike-push-up', 'ex-incline-plank',
      'ex-knee-plank', 'ex-knee-side-plank', 'ex-supported-static-lunge', 'ex-towel-lat-pulldown', 'ex-wall-push-up', 'ex-wall-sit'
    ]);
  });
  it('פציעה: תרגיל חסום לא נבחר', () => {
    const inj = { id: 'i', createdAt: '', updatedAt: '', deletedAt: null, area: 'knee', pain: 5, status: 'active' as const, startDate: '2026-09-01', healedDate: null, notes: '', blockedExercises: ['ex-chair-squat'], blockedFamilies: [], blockedMuscles: [] };
    const ch = foundationStartChanges(fresh(), [home], [inj]);
    expect(ch['ex-chair-squat']).toBeUndefined();
    expect(ch['ex-wall-sit']).toBe('yellow');
  });
});

describe('R-BEG-7: כיול באימון הראשון', () => {
  const exs = exercisesWith(0);
  const wall = exs.find((e) => e.id === 'ex-wall-push-up')!;
  const next = [{ ex: exs.find((e) => e.id === 'ex-incline-push-up')!, availableSomewhere: true }];
  const s = (vals: number[], rpe = 7, date = '2026-10-01') => session(wall.id, date, vals, { rpe, targetMin: wall.targetMin, targetMax: wall.targetMax });
  it('סט מעל הטווח עם RPE עד 8 ← מעבר מיידי', () => {
    const r = calibrationSuggestion(wall, 'horizontalPush', [s([wall.targetMin, wall.targetMax + 3])], next);
    expect(r?.type).toBe('advance');
    expect(r?.payload.nextId).toBe('ex-incline-push-up');
  });
  it('בטווח, או RPE 9, או לא האימון הראשון: אין', () => {
    expect(calibrationSuggestion(wall, 'horizontalPush', [s([wall.targetMax, wall.targetMax])], next)).toBeNull();
    expect(calibrationSuggestion(wall, 'horizontalPush', [s([wall.targetMax + 3], 9)], next)).toBeNull();
    expect(calibrationSuggestion(wall, 'horizontalPush', [s([10]), s([wall.targetMax + 3], 7, '2026-10-03')], next)).toBeNull();
    expect(calibrationSuggestion(wall, 'horizontalPush', [s([wall.targetMax + 3])], [])).toBeNull();
  });
});
