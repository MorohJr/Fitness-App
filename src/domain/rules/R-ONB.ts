// R-ONB: מסך פתיחה (אשף). לוגיקה בלבד
import type { ActivityLevel, PhaseType, Profile, Sex } from '../types';
import { suggestCalories, type CalculatorResult } from '../calc/energy';
import { macrosFor, type Macros } from '../calc/macros';

export const ONB_STEPS = 7;

/** קצב שינוי משקל לשבוע לפי סוג שלב (ברירת מחדל, 4.1) */
export const PHASE_DEFAULT_RATE: Record<PhaseType, number> = { cut: -0.5, bulk: 0.25, recomp: 0, maintain: 0 };

export interface OnbState {
  /** האשף הושלם במכשיר הזה */
  done: boolean;
  /** השלב שבו עצרת (null = לא התחיל) */
  step: number | null;
  demo: boolean;
}

export const profileComplete = (p: Pick<Profile, 'sex' | 'birthDate' | 'heightCm'> | undefined | null): boolean =>
  !!(p?.sex && p.birthDate && p.heightCm);

/** R-ONB-1: לא הושלם, ובנוסף כבר התחיל או שהפרופיל לא מלא. לא במצב הדגמה */
export function shouldShowOnboarding(s: OnbState, profile: Pick<Profile, 'sex' | 'birthDate' | 'heightCm'> | undefined | null): boolean {
  if (s.done || s.demo) return false;
  return s.step !== null || !profileComplete(profile);
}

/** R-ONB-3: השלב הבא או הקודם, בגבולות 1–7 */
export const nextStep = (step: number) => Math.min(ONB_STEPS, step + 1);
export const prevStep = (step: number) => Math.max(1, step - 1);

export interface OnbTargetsInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: PhaseType;
  proteinPerKg: number;
  fatPerKgMin: number;
}

/** R-ONB-2 שלב 5: הצעת המחשבון (R-NUT-1) והמאקרו (R-NUT-2) לפי המטרה */
export function onboardingSuggestion(i: OnbTargetsInput): { result: CalculatorResult; macros: Macros } {
  const result = suggestCalories({ sex: i.sex, weightKg: i.weightKg, heightCm: i.heightCm, age: i.age, activityLevel: i.activityLevel, phaseType: i.goal });
  return { result, macros: macrosFor(result.calories, i.weightKg, i.proteinPerKg, i.fatPerKgMin) };
}
