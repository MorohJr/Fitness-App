// תוכנית יסודות (R-BEG): התחלה, מעבר לתוכנית הרגילה, והצעת הסיום
import type { ISODate, Suggestion, WeekPlanVersion } from '../domain/types';
import { DEFAULT_WEEK_DAYS, FOUNDATION_WEEK_DAYS } from '../domain/rules/R-DAY';
import { FOUNDATION_FAMILIES, FOUNDATION_WEEKS, foundationDue, foundationOn, foundationStartChanges, foundationStartDate, foundationStartExercises, pendingFoundation, remainingTestFamilies, type FoundationInfo } from '../domain/rules/R-BEG';
import { applyStatusChanges } from './repos/exercises';
import { getProfile } from './repos/profile';
import { listInjuries } from './repos/injuries';
import type { Exercise } from '../domain/types';
import { familyReady } from '../domain/rules/opening-test';
import { STRENGTH_FAMILIES, FAMILY_META, type FamilyId } from '../domain/families';
import { formatDate, nextSunday, startOfWeek } from '../domain/calc/dates';
import { versionForDate } from '../domain/rules/R-VER';
import { getDb } from './db';
import { clock } from './clock';
import { alive } from './repos/base';
import { listExercises } from './repos/exercises';
import { listWeekPlanVersions, saveWeekPlan } from './repos/weekPlan';
import { createSuggestion } from './repos/suggestions';
import { registerCheck } from './checks';

export interface FoundationState {
  /** התוכנית פעילה היום */
  active: FoundationInfo | null;
  /** נקבעה ועוד לא התחילה */
  pending: WeekPlanVersion | null;
  /** מעבר לתוכנית הרגילה שכבר נקבע לעתיד */
  switchPending: WeekPlanVersion | null;
  /** משפחות היסודות שכבר נבדקו (R-BEG-2) */
  readyFamilies: FamilyId[];
  /** משפחות שעוד לא נבדקו בסוף התוכנית (R-BEG-6) */
  remainingFamilies: FamilyId[];
  /** מתי תתחיל אם מתחילים עכשיו (R-BEG-2) */
  startsOn: ISODate;
  /** תרגילי ההתחלה בכל משפחה (R-BEG-2) */
  startList: { family: FamilyId; exercises: Exercise[]; ready: boolean }[];
}

export async function getFoundationState(today: ISODate = clock.today()): Promise<FoundationState> {
  const [versions, exs, profile, injuries] = await Promise.all([listWeekPlanVersions(), listExercises(), getProfile(), listInjuries()]);
  const active = foundationOn(versions, today);
  const cur = versionForDate(versions, today);
  const switchPending = versions.find((v) => v.effectiveFrom > today && v.program !== 'foundation' && (active || cur?.program === 'foundation')) ?? null;
  return {
    active,
    pending: pendingFoundation(versions, today),
    switchPending,
    readyFamilies: FOUNDATION_FAMILIES.filter((f) => familyReady(exs, f)),
    remainingFamilies: remainingTestFamilies(STRENGTH_FAMILIES).filter((f) => !familyReady(exs, f)),
    startsOn: foundationStartDate(versions, today) ?? nextSunday(today),
    startList: foundationStartExercises(exs, profile?.locations ?? [], injuries)
  };
}

/** R-BEG-2: גרסת תוכנית של יסודות. הראשונה מהיום, אחרת מיום ראשון הבא (R-VER-2). באישור, מהמסך */
export async function startFoundation(): Promise<WeekPlanVersion> {
  // בלי מבחן לפני: תרגילי ההתחלה עוברים ל-🟡 באישור הזה (E2)
  const [exs, profile, injuries] = await Promise.all([listExercises(), getProfile(), listInjuries()]);
  await applyStatusChanges(foundationStartChanges(exs, profile?.locations ?? [], injuries));
  const from = foundationStartDate(await listWeekPlanVersions(), clock.today()) ?? undefined;
  return saveWeekPlan(FOUNDATION_WEEK_DAYS, 'foundation', from);
}

/** R-BEG-6: התוכנית הרגילה (R-DAY-1) מיום ראשון הבא */
export async function switchToRegular(): Promise<WeekPlanVersion> {
  return saveWeekPlan(DEFAULT_WEEK_DAYS, 'regular');
}

/** R-BEG-6: מהשבוע השישי, הצעה אחת לשבוע לעבור לתוכנית הרגילה */
export async function checkFoundationDone(): Promise<void> {
  const today = clock.today();
  const state = await getFoundationState(today);
  if (!foundationDue(state.active) || state.switchPending) return;
  const week = startOfWeek(today);
  const all = alive((await getDb().data('suggestions').toArray()) as Suggestion[]);
  if (all.some((s) => s.type === 'foundationDone' && s.payload.weekStart === week)) return;
  const names = state.remainingFamilies.map((f) => FAMILY_META[f].name).join(', ');
  await createSuggestion({
    type: 'foundationDone', refId: week, date: today, payload: { weekStart: week },
    title: `שבוע ${state.active!.week} מתוך ${FOUNDATION_WEEKS} בתוכנית היסודות. לעבור לתוכנית הרגילה?`,
    reason: `אישור = התוכנית הרגילה מיום ראשון ${formatDate(nextSunday(today))}${names ? `, ומומלץ מבחן פתיחה ל: ${names}` : ''}. אין שבוע הורדת עומס עד אז (R-BEG-5, R-BEG-6)`
  });
}

registerCheck(checkFoundationDone);
