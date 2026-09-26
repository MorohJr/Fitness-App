// מחשבון קלוריות התחלתי (R-NUT-1)
import type { ActivityLevel, PhaseType, Sex } from '../types';

/** מקדמי פעילות (R-NUT-1) */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.4,
  light: 1.5,
  moderate: 1.6,
  high: 1.7
};

/** טווח התאמה לשלב באחוזים, וברירת המחדל (R-NUT-1) */
export const PHASE_ADJUST: Record<PhaseType, { min: number; max: number; default: number }> = {
  cut: { min: -20, max: -15, default: -15 },
  bulk: { min: 5, max: 10, default: 5 },
  recomp: { min: -5, max: 0, default: -5 },
  maintain: { min: 0, max: 0, default: 0 }
};

/** BMR לפי Mifflin-St Jeor */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export interface CalculatorInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  phaseType: PhaseType;
  adjustPct?: number;
}

export interface CalculatorResult {
  bmr: number;
  tdee: number;
  adjustPct: number;
  calories: number;
}

/** הצעת יעד קלורי. מעוגל ל-10. נשמר רק באישור (E2) */
export function suggestCalories(input: CalculatorInput): CalculatorResult {
  const range = PHASE_ADJUST[input.phaseType];
  const adjustPct = input.adjustPct ?? range.default;
  if (adjustPct < range.min || adjustPct > range.max) {
    throw new Error(`התאמה ${adjustPct}% מחוץ לטווח ${range.min}–${range.max}%`);
  }
  const b = bmr(input.sex, input.weightKg, input.heightCm, input.age);
  const tdee = b * ACTIVITY_FACTORS[input.activityLevel];
  const calories = Math.round((tdee * (1 + adjustPct / 100)) / 10) * 10;
  return { bmr: Math.round(b), tdee: Math.round(tdee), adjustPct, calories };
}
