import { describe, expect, it } from 'vitest';
import { blockReasons, INJURY_AREAS, isBlocked } from '../../src/domain/rules/R-INJ';
import { buildSeedExercises } from '../../src/data/seed/exercises';
import type { Exercise, Injury } from '../../src/domain/types';

const all: Exercise[] = buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));
const get = (id: string) => all.find((e) => e.id === id)!;
const inj = (p: Partial<Injury>): Injury => ({
  id: 'i1', createdAt: '', updatedAt: '', deletedAt: null, area: 'knee', pain: 5, status: 'active', startDate: '2026-09-01', healedDate: null, notes: '',
  blockedExercises: [], blockedFamilies: [], blockedMuscles: [], ...p
});

describe('✅ בדיקת קבלה: פציעה פעילה חוסמת את התרגילים שלה (R-INJ-1)', () => {
  it('חסימה לפי משפחה', () => {
    const i = inj({ blockedFamilies: ['squat'] });
    expect(isBlocked(get('ex-bodyweight-squat'), [i])).toBe(true);
    expect(isBlocked(get('ex-push-up'), [i])).toBe(false);
  });
  it('חסימה לפי תרגיל', () => {
    const i = inj({ blockedExercises: ['ex-pull-up'] });
    expect(isBlocked(get('ex-pull-up'), [i])).toBe(true);
    expect(isBlocked(get('ex-chin-up'), [i])).toBe(false);
  });
  it('חסימה לפי שריר, ראשי או משני', () => {
    const i = inj({ blockedMuscles: ['triceps'] });
    expect(isBlocked(get('ex-db-overhead-extension'), [i])).toBe(true); // ראשי
    expect(isBlocked(get('ex-push-up'), [i])).toBe(true); // משני
    expect(isBlocked(get('ex-bodyweight-squat'), [i])).toBe(false);
  });
  it('תרגיל בשתי משפחות נחסם גם דרך המשפחה השנייה', () => {
    expect(isBlocked(get('ex-bench-dip'), [inj({ blockedFamilies: ['triceps'] })])).toBe(true);
  });
  it('גם "בהחלמה" חוסם. "החלים" ופציעה מחוקה לא חוסמות', () => {
    const f = { blockedFamilies: ['squat'] };
    expect(isBlocked(get('ex-split-squat'), [inj({ ...f, status: 'recovering' })])).toBe(true);
    expect(isBlocked(get('ex-split-squat'), [inj({ ...f, status: 'healed', healedDate: '2026-09-10' })])).toBe(false);
    expect(isBlocked(get('ex-split-squat'), [inj({ ...f, deletedAt: 'x' })])).toBe(false);
  });
  it('סיבות החסימה מפורטות', () => {
    const r = blockReasons(get('ex-bench-dip'), [inj({ blockedFamilies: ['dips'], blockedMuscles: ['triceps'] })]);
    expect(r.map((x) => x.by).sort()).toEqual(['family', 'muscle']);
  });
  it('נספח ו׳: ברך מציעה סקוואט ורגל אחת', () => {
    expect(INJURY_AREAS.knee.families).toEqual(['squat', 'singleLeg']);
  });
});
