import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp } from './helpers';
import { finishOnboarding, getOnboarding, resetOnboarding, saveOnboardingTargets, setOnboardingStep } from '../../src/data/onboarding';
import { updateProfile } from '../../src/data/repos/profile';
import { deleteAllData } from '../../src/data/backup/backup';
import { listPhases } from '../../src/data/repos/phases';
import { listTargetVersions } from '../../src/data/repos/targets';
import { DEFAULT_TARGET_VALUES } from '../../src/data/seed/defaults';
import { shouldShowOnboarding } from '../../src/domain/rules/R-ONB';

beforeEach(async () => {
  await freshApp('2026-10-05');
});

describe('✅ R-ONB-1: מתי מסך הפתיחה מופיע', () => {
  it('כללים טהורים', () => {
    const full = { sex: 'male' as const, birthDate: '1990-01-01', heightCm: 178 };
    expect(shouldShowOnboarding({ done: false, step: null, demo: false }, null)).toBe(true);
    expect(shouldShowOnboarding({ done: false, step: null, demo: false }, full)).toBe(false);
    expect(shouldShowOnboarding({ done: false, step: 3, demo: false }, full)).toBe(true);
    expect(shouldShowOnboarding({ done: true, step: null, demo: false }, null)).toBe(false);
    expect(shouldShowOnboarding({ done: false, step: null, demo: true }, null)).toBe(false);
  });
  it('פתיחה ראשונה ← מופיע; סיום ← לא; מחיקת כל הנתונים ← שוב', async () => {
    expect((await getOnboarding()).show).toBe(true);
    await setOnboardingStep(4);
    expect((await getOnboarding()).step).toBe(4);
    await finishOnboarding();
    expect((await getOnboarding()).show).toBe(false);
    await deleteAllData();
    expect((await getOnboarding())).toMatchObject({ show: true, step: 1 });
  });
  it('פרופיל מלא בלי אשף שהתחיל ← לא מופיע', async () => {
    await resetOnboarding();
    await updateProfile({ sex: 'male', birthDate: '1990-01-01', heightCm: 178 });
    expect((await getOnboarding()).show).toBe(false);
  });
});

describe('✅ R-ONB-2 שלב 5: יעדים ושלב באישור', () => {
  it('חיטוב פותח שלב מהיום, ופעם שנייה לא פותח שלב נוסף', async () => {
    const values = { ...DEFAULT_TARGET_VALUES, calories: 2100 };
    expect(await saveOnboardingTargets(values, 'cut')).toEqual({ phaseCreated: true });
    expect((await listTargetVersions()).at(-1)?.calories).toBe(2100);
    const phases = await listPhases();
    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({ type: 'cut', startDate: '2026-10-05', calories: 2100, weeklyRateKg: -0.5 });
    expect(await saveOnboardingTargets(values, 'bulk')).toEqual({ phaseCreated: false });
    expect(await listPhases()).toHaveLength(1);
  });
  it('תחזוקה: רק יעדים, בלי שלב', async () => {
    expect(await saveOnboardingTargets({ ...DEFAULT_TARGET_VALUES }, 'maintain')).toEqual({ phaseCreated: false });
    expect(await listPhases()).toHaveLength(0);
  });
});
