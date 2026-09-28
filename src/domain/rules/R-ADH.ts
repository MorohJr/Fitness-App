// R-ADH: עמידה ביעדים ורצף
import type { AdherenceRanges, DayTargets, Nutrients } from '../types';

/** R-ADH-1: קלוריות בטווח ±X% וגם חלבון לפחות Y% מיעד היום */
export function nutritionMet(eaten: Pick<Nutrients, 'kcal' | 'protein'>, t: Pick<DayTargets, 'calories' | 'proteinG' | 'adherence'>): boolean | null {
  if (t.calories === null || !t.adherence) return null;
  const a: AdherenceRanges = t.adherence;
  const kcalOk = Math.abs(eaten.kcal - t.calories) <= (t.calories * a.caloriesPct) / 100;
  const proteinOk = t.proteinG === null ? true : eaten.protein >= (t.proteinG * a.proteinMinPct) / 100;
  return kcalOk && proteinOk;
}
