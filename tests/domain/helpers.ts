import type { Phase, TargetVersion } from '../../src/domain/types';

const base = (id: string) => ({ id, createdAt: '', updatedAt: '', deletedAt: null });

export const tv = (id: string, effectiveFrom: string, calories: number, extra: Partial<TargetVersion> = {}): TargetVersion => ({
  ...base(id),
  effectiveFrom,
  calories,
  proteinPerKg: 1.8,
  fatPerKgMin: 0.8,
  waterL: 3,
  steps: 8000,
  adherence: { caloriesPct: 10, proteinMinPct: 90 },
  ...extra
});

export const ph = (id: string, startDate: string, endDate: string | null, calories = 2000, extra: Partial<Phase> = {}): Phase => ({
  ...base(id),
  type: 'cut',
  startDate,
  endDate,
  calories,
  weeklyRateKg: -0.5,
  ...extra
});
