// התוכנית בפועל ליום: תוכנית שבועית ← אימון שהוחמץ (R-DAY-5) ← החלפה להתאוששות (R-REC-2). הורדת עומס (R-DL)
import type { DayPlan, ISODate, Suggestion, Workout } from '../domain/types';
import { dayPlanForDate, weekSchedule } from '../domain/rules/R-DAY';
import { isDeloadWeek, type DeloadContext } from '../domain/rules/R-DL';
import { startOfWeek } from '../domain/calc/dates';
import { deloadProgramStart, foundationOn, type FoundationInfo } from '../domain/rules/R-BEG';
import { getDb } from './db';
import { alive } from './repos/base';
import { listWeekPlanVersions } from './repos/weekPlan';
import { getProfile } from './repos/profile';

async function decided(): Promise<Suggestion[]> {
  return alive((await getDb().data('suggestions').toArray()) as Suggestion[]).filter((s) => s.status !== 'pending');
}

/** טוען פעם אחת ומחזיר פונקציה לכל תאריך (לחישובים על הרבה ימים) */
export async function effectivePlanResolver(): Promise<(date: ISODate) => DayPlan> {
  const versions = await listWeekPlanVersions();
  const base = (d: ISODate) => dayPlanForDate(versions, d);
  const dec = await decided();
  const makeups = dec
    .filter((s) => s.type === 'missedWorkout' && s.status === 'approved')
    .map((s) => ({ decidedOn: s.date, templateId: s.payload.templateId as string }));
  const swaps = new Set(dec.filter((s) => s.type === 'recoverySwap' && s.status === 'approved').map((s) => s.date));
  const weeks = new Map<ISODate, Map<ISODate, DayPlan>>();
  return (date: ISODate) => {
    const ws = startOfWeek(date);
    if (!weeks.has(ws)) weeks.set(ws, weekSchedule(ws, base, makeups));
    const plan = weeks.get(ws)!.get(date) ?? base(date);
    if (plan.dayType === 'training' && swaps.has(date)) return { dayType: 'activeRecovery', templateId: 'tpl-recovery' };
    return plan;
  };
}

export async function getEffectiveDayPlan(date: ISODate): Promise<DayPlan> {
  return (await effectivePlanResolver())(date);
}

/** R-BEG: האם התאריך בתוכנית יסודות, ובאיזה שבוע */
export async function getFoundationInfo(date: ISODate): Promise<FoundationInfo | null> {
  return foundationOn(await listWeekPlanVersions(), date);
}

export async function getDeloadContext(): Promise<DeloadContext> {
  const workouts = alive((await getDb().data('workouts').toArray()) as Workout[]).filter((w) => w.kind === 'regular' && w.status === 'completed');
  // R-BEG-5: הספירה מתחילה אחרי תוכנית היסודות
  const programStart = deloadProgramStart(workouts.map((w) => w.date), await listWeekPlanVersions());
  const profile = await getProfile();
  const dec = await decided();
  const weeks = (t: Suggestion['type']) => dec.filter((s) => s.type === t && s.status === 'approved').map((s) => s.payload.weekStart as string);
  return {
    programStart,
    every: profile?.settings.deloadEveryWeeks ?? 5,
    earlyWeeks: weeks('deloadEarly'),
    postponedWeeks: weeks('deloadPostpone')
  };
}

export async function isDeloadDate(date: ISODate): Promise<boolean> {
  // R-BEG-5: בתוכנית יסודות אין הורדת עומס
  if (await getFoundationInfo(date)) return false;
  return isDeloadWeek(date, await getDeloadContext());
}

/** R-REC-2: האם ההצעה לעבור להתאוששות נדחתה היום */
export async function lowRecoveryDeclined(date: ISODate): Promise<boolean> {
  return (await decided()).some((s) => s.type === 'recoverySwap' && s.status === 'rejected' && s.date === date);
}
