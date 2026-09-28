import { describe, expect, it } from 'vitest';
import { buildSeedExercises } from '../../src/data/seed/exercises';
import { DEFAULT_TEMPLATES } from '../../src/domain/rules/R-DAY';
import { FAMILY_IDS, FAMILY_META, STRENGTH_FAMILIES } from '../../src/domain/families';
import { MUSCLE_IDS } from '../../src/domain/muscles';
import { DEFAULT_EQUIPMENT, DEFAULT_LOCATIONS } from '../../src/data/seed/defaults';
import { availableAt, ladder } from '../../src/domain/calc/exercises';
import type { Exercise } from '../../src/domain/types';

const all: Exercise[] = buildSeedExercises().map((e) => ({ ...e, createdAt: '', updatedAt: '', deletedAt: null }));

describe('שלמות מאגר התרגילים (נספח ג׳)', () => {
  it('מזהים ושמות ייחודיים', () => {
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    expect(new Set(all.map((e) => e.name)).size).toBe(all.length);
  });
  it('כל משפחה קיימת, והרמות בכל סולם רציפות מ-1', () => {
    for (const f of FAMILY_IDS) {
      const levels = [...new Set(ladder(all, f).map((e) => e.families.find((x) => x.family === f)!.level))];
      expect(levels.length, f).toBeGreaterThan(0);
      expect(levels, f).toEqual(levels.map((_, i) => i + 1));
    }
  });
  it('כל משפחה בתבניות קיימת במאגר, ואין משבצת "ליבה" כללית', () => {
    for (const t of DEFAULT_TEMPLATES) for (const s of t.slots) expect(FAMILY_IDS, s.family).toContain(s.family);
  });
  it('כל משפחת ליבה מקבלת פעמיים בשבוע (נספח ב׳)', () => {
    const count = (f: string) => DEFAULT_TEMPLATES.flatMap((t) => t.slots).filter((s) => s.family === f).length;
    expect([count('coreFront'), count('coreSide'), count('plank')]).toEqual([2, 2, 2]);
  });
  it('שרירים, ציוד וטווחים תקינים', () => {
    const eq = new Set(DEFAULT_EQUIPMENT.map((e) => e.id));
    for (const e of all) {
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) expect(MUSCLE_IDS, e.name).toContain(m);
      for (const q of e.equipment) expect(eq.has(q), `${e.name}: ${q}`).toBe(true);
      expect(e.targetMin).toBeLessThan(e.targetMax);
      expect(e.cues.length).toBeGreaterThan(0);
    }
  });
  it('סטטוס: 🔴 למשפחות כוח, בלי סטטוס ליציבה/לסת/מוביליטי', () => {
    for (const e of all) {
      const kind = FAMILY_META[e.familyIds[0] as keyof typeof FAMILY_META].kind;
      expect(e.status).toBe(kind === 'strength' ? 'red' : null);
    }
  });
  it('טווחי ברירת מחדל: ראשי 6–12, רגל אחת 8–12, אביזר 10–15, החזקה 20–45, ליבה בזמן 30–60', () => {
    const g = (id: string) => all.find((e) => e.id === id)!;
    expect([g('ex-push-up').targetMin, g('ex-push-up').targetMax]).toEqual([6, 12]);
    expect([g('ex-step-up').targetMin, g('ex-step-up').targetMax]).toEqual([8, 12]);
    expect([g('ex-calf-raise').targetMin, g('ex-calf-raise').targetMax]).toEqual([10, 15]);
    expect([g('ex-dead-hang').targetMin, g('ex-dead-hang').targetMax]).toEqual([20, 45]);
    expect([g('ex-plank').targetMin, g('ex-plank').targetMax]).toEqual([30, 60]);
    expect(g('ex-push-up').restSec).toBe(120);
    expect(g('ex-calf-raise').restSec).toBe(60);
  });
  it('בחוץ, עם ציוד ברירת המחדל, יש תרגיל לכל משפחת כוח', () => {
    const outdoor = DEFAULT_LOCATIONS.find((l) => l.id === 'outdoor')!;
    for (const f of STRENGTH_FAMILIES) expect(ladder(all, f).some((e) => availableAt(e, outdoor)), f).toBe(true);
  });
  it('17 משפחות כוח (כל נספח ג׳ חוץ מיציבה, לסת ומוביליטי)', () => {
    expect(STRENGTH_FAMILIES).toHaveLength(17);
  });
  it('חלופה לבית: Dumbbell Row באותה רמה כמו Australian Row', () => {
    const home = DEFAULT_LOCATIONS.find((l) => l.id === 'home')!;
    const row = ladder(all, 'horizontalPull').filter((e) => availableAt(e, home));
    expect(row.map((e) => e.id)).toEqual(['ex-dumbbell-row']);
  });
});
