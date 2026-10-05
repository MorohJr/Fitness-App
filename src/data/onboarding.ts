// מסך פתיחה (R-ONB): מצב האשף, ושמירת השלבים
import type { ISODate, PhaseType, TargetValues } from '../domain/types';
import { ONB_STEPS, PHASE_DEFAULT_RATE, shouldShowOnboarding } from '../domain/rules/R-ONB';
import { activePhase } from '../domain/rules/phase';
import { clock } from './clock';
import { getMeta, setMeta } from './repos/meta';
import { getProfile } from './repos/profile';
import { listPhases, savePhase } from './repos/phases';
import { saveTargets } from './repos/targets';
import { isDemoMode } from './demo/state';

export interface OnbView {
  show: boolean;
  step: number;
  goal: PhaseType | null;
}

/** R-ONB-1 (הסימון נשמר רק במכשיר, בטבלת meta) */
export async function getOnboarding(): Promise<OnbView> {
  const [done, step, goal, demo, profile] = await Promise.all([
    getMeta<string>('onboarding'), getMeta<number>('onboardingStep'), getMeta<PhaseType>('onboardingGoal'), isDemoMode(), getProfile()
  ]);
  const show = shouldShowOnboarding({ done: done === 'done', step: step ?? null, demo }, profile);
  return { show, step: Math.min(ONB_STEPS, Math.max(1, step ?? 1)), goal: goal ?? null };
}

/** R-ONB-3: האשף זוכר באיזה שלב עצרת */
export async function setOnboardingStep(step: number): Promise<void> {
  await setMeta('onboardingStep', step);
}

export async function setOnboardingGoal(goal: PhaseType): Promise<void> {
  await setMeta('onboardingGoal', goal);
}

/** R-ONB-4: סיום. מכאן האשף לא מופיע עד מחיקת כל הנתונים או הרצה מחדש */
export async function finishOnboarding(): Promise<void> {
  await setMeta('onboarding', 'done');
  await setMeta('onboardingStep', null);
}

/** R-ONB-5: הרצה מחדש מההגדרות. לא מוחק נתונים */
export async function restartOnboarding(): Promise<void> {
  await setMeta('onboarding', null);
  await setMeta('onboardingStep', 1);
}

/** מחיקת כל הנתונים מאפסת את האשף (R-ONB-1) */
export async function resetOnboarding(): Promise<void> {
  await setMeta('onboarding', null);
  await setMeta('onboardingStep', null);
  await setMeta('onboardingGoal', null);
}

/**
 * R-ONB-2 שלב 5: שמירת היעדים באישור (E2). מטרה שאינה תחזוקה פותחת שלב מהיום,
 * אלא אם כבר יש שלב פעיל. מחזיר אם נפתח שלב
 */
export async function saveOnboardingTargets(values: TargetValues, goal: PhaseType, today: ISODate = clock.today()): Promise<{ phaseCreated: boolean }> {
  await saveTargets(values);
  if (goal === 'maintain') return { phaseCreated: false };
  if (activePhase(await listPhases(), today)) return { phaseCreated: false };
  await savePhase({ type: goal, startDate: today, endDate: null, calories: values.calories, weeklyRateKg: PHASE_DEFAULT_RATE[goal] });
  return { phaseCreated: true };
}
