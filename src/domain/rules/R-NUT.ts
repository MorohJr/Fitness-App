// R-NUT: יעדי יום (R-NUT-4), עם מאקרו (R-NUT-2)
import type { DayTargets, ISODate, Phase, TargetVersion, WeighIn } from '../types';
import { macrosFor } from '../calc/macros';
import { referenceWeight } from '../calc/weight';
import { versionForDate } from './R-VER';
import { activePhase, phaseCaloriesOn } from './phase';

export interface DayTargetsInput {
  date: ISODate;
  targetVersions: TargetVersion[];
  phases: Phase[];
  weighIns: WeighIn[];
  manualWeightKg: number | null;
}

export const EMPTY_TARGETS: DayTargets = {
  calories: null,
  proteinG: null,
  fatG: null,
  carbsG: null,
  waterL: null,
  steps: null,
  adherence: null,
  referenceWeightKg: null,
  calorieSource: null
};

/** R-NUT-4: קלוריות מהשלב הפעיל, אחרת מגרסת היעדים. השאר מגרסת היעדים */
export function computeDayTargets(input: DayTargetsInput): DayTargets {
  const version = versionForDate(input.targetVersions, input.date);
  const phase = activePhase(input.phases, input.date);
  const calories = phase ? phaseCaloriesOn(phase, input.date) : version ? version.calories : null;
  const refWeight = referenceWeight(input.weighIns, input.date, input.manualWeightKg);

  const t: DayTargets = {
    ...EMPTY_TARGETS,
    calories,
    calorieSource: phase ? 'phase' : version ? 'targets' : null,
    referenceWeightKg: refWeight,
    waterL: version?.waterL ?? null,
    steps: version?.steps ?? null,
    adherence: version ? { ...version.adherence } : null
  };
  if (version && refWeight !== null && calories !== null) {
    const m = macrosFor(calories, refWeight, version.proteinPerKg, version.fatPerKgMin);
    t.proteinG = m.proteinG;
    t.fatG = m.fatG;
    t.carbsG = m.carbsG;
  }
  return t;
}
