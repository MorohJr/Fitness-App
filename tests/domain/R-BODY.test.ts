import { describe, expect, it } from 'vitest';
import { composition, deltas, navyBodyFat } from '../../src/domain/calc/bodyfat';
import { measurementDue, milestoneState, personalRecords, photoCleanupCandidate, SUGGESTED_MILESTONES } from '../../src/domain/rules/R-BODY';
import { exercisesWith, session } from './engine-helpers';
import type { Milestone, ProgressPhotoSet } from '../../src/domain/types';
import { buildSeedExercises } from '../../src/data/seed/exercises';

describe('✅ בדיקת קבלה: אחוז שומן תואם חישוב ידני (R-BODY-1)', () => {
  it('גבר: 180 ס"מ, מותניים 85, צוואר 38', () => {
    // 495 / (1.0324 − 0.19077·log10(47) + 0.15456·log10(180)) − 450
    const manual = 495 / (1.0324 - 0.19077 * Math.log10(47) + 0.15456 * Math.log10(180)) - 450;
    expect(navyBodyFat('male', 180, 85, 38)).toBe(Math.round(manual * 10) / 10);
    expect(navyBodyFat('male', 180, 85, 38)).toBeCloseTo(16.1, 1);
  });
  it('אישה: 165, מותניים 72, אגן 98, צוואר 33', () => {
    const manual = 495 / (1.29579 - 0.35004 * Math.log10(72 + 98 - 33) + 0.221 * Math.log10(165)) - 450;
    expect(navyBodyFat('female', 165, 72, 33, 98)).toBe(Math.round(manual * 10) / 10);
  });
  it('R-BODY-2: מסה רזה ומסת שומן', () => {
    const c = composition({ weightKg: 80, heightCm: 180, sex: 'male', circ: { waist: 85, neck: 38 } });
    expect(c.bodyFat).toBeCloseTo(16.1, 1);
    expect(c.leanKg! + c.fatKg!).toBeCloseTo(80, 1);
  });
  it('נתונים חסרים: אין אחוז שומן', () => {
    expect(composition({ weightKg: 80, heightCm: null, sex: 'male', circ: { waist: 85, neck: 38 } }).bodyFat).toBeNull();
    expect(navyBodyFat('female', 165, 72, 33, null)).toBeNull();
  });
});

describe('שינוי מהקודמת ומהבסיס', () => {
  it('מדלג על ערכים חסרים', () => {
    const v = [90, null, 88, 87.5];
    expect(deltas(v, 3)).toEqual({ fromPrev: -0.5, fromBase: -2.5 });
    expect(deltas(v, 0)).toEqual({ fromPrev: null, fromBase: null });
    expect(deltas(v, 1)).toEqual({ fromPrev: null, fromBase: null });
  });
});

describe('R-BODY-5/6 שיאים ואבני דרך', () => {
  const exs = new Map(exercisesWith(3).map((e) => [e.id, e]));
  it('שיא מ-SetLog, בחד-צדדי הצד החלש', () => {
    const prs = personalRecords([session('ex-push-up', '2026-10-01', [10, 12, 9]), session('ex-push-up', '2026-10-05', [11, 11]), session('ex-archer-push-up', '2026-10-05', [8], { left: [6] })], exs);
    expect(prs.get('ex-push-up')).toMatchObject({ maxReps: 12, date: '2026-10-01' });
    expect(prs.get('ex-archer-push-up')!.maxReps).toBe(6);
  });
  it('אבן דרך: נעול → מוכן למבחן → הושג', () => {
    const m: Milestone = { id: 'm', createdAt: '', updatedAt: '', deletedAt: null, name: 'x', requirements: [{ exerciseId: 'ex-push-up', value: 12 }], achieved: false, targetDate: null, completedDate: null };
    expect(milestoneState(m, personalRecords([session('ex-push-up', 'd', [11])], exs))).toBe('locked');
    expect(milestoneState(m, personalRecords([session('ex-push-up', 'd', [12])], exs))).toBe('ready');
    expect(milestoneState({ ...m, achieved: true }, new Map())).toBe('achieved');
  });
  it('אבני הדרך המוצעות מפנות לתרגילים קיימים', () => {
    const ids = new Set(buildSeedExercises().map((e) => e.id));
    for (const m of SUGGESTED_MILESTONES) for (const r of m.requirements) expect(ids.has(r.exerciseId)).toBe(true);
  });
  it('R-BODY-4: תזכורת אחרי 14 יום', () => {
    expect(measurementDue('2026-10-01', '2026-10-15')).toBe(true);
    expect(measurementDue('2026-10-01', '2026-10-14')).toBe(false);
  });
});

describe('✅ בדיקת קבלה: סט הבסיס לא נמחק גם כשהמגבלה נחצית (R-PHOTO-2, R-PHOTO-3)', () => {
  const set = (id: string, date: string, isBaseline = false): ProgressPhotoSet => ({ id, createdAt: '', updatedAt: '', deletedAt: null, measurementId: null, date, isBaseline });
  it('הישן ביותר שאינו הבסיס מוצע', () => {
    const sets = [set('base', '2026-01-01', true), set('a', '2026-02-01'), set('b', '2026-03-01')];
    const counts = new Map([['base', 3], ['a', 3], ['b', 3]]);
    expect(photoCleanupCandidate(sets, counts, 3)?.id).toBe('a');
    expect(photoCleanupCandidate(sets, counts, 6)).toBeNull();
  });
  it('רק סט בסיס: אף פעם לא מוצע', () => {
    expect(photoCleanupCandidate([set('base', '2026-01-01', true)], new Map([['base', 3]]), 0)).toBeNull();
  });
});
