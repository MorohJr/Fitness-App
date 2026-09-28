// בדיקות של מנוע האימונים שיוצרות הצעות (E2): אימון שהוחמץ, התאוששות נמוכה, הורדת עומס מוקדמת, נפח
import type { DayTemplate, Suggestion, Workout } from '../domain/types';
import { addDays, formatDate, startOfWeek } from '../domain/calc/dates';
import { dayPlanForDate, findMissed, weekSchedule } from '../domain/rules/R-DAY';
import { isLowRecovery, recoveryScore } from '../domain/rules/R-REC';
import { canPostpone, earlyDeloadReasons, isDeloadWeek } from '../domain/rules/R-DL';
import { evaluate } from '../domain/rules/R-PRG';
import { volumeOutOfRange } from '../domain/engine/volume';
import { ladder } from '../domain/calc/exercises';
import { MUSCLES, type MuscleId } from '../domain/muscles';
import { getDb } from './db';
import { clock } from './clock';
import { alive } from './repos/base';
import { createSuggestion } from './repos/suggestions';
import { listWeekPlanVersions } from './repos/weekPlan';
import { getEffectiveDayPlan, getDeloadContext } from './plan';
import { getDayLog, listDayLogs } from './repos/dayLogs';
import { getHistory } from './repos/workouts';
import { listExercises } from './repos/exercises';
import { registerCheck } from './checks';

async function allSuggestions(): Promise<Suggestion[]> {
  return alive((await getDb().data('suggestions').toArray()) as Suggestion[]);
}

/** R-DAY-5: ביום אימון, אם יום אימון קודם השבוע הוחמץ */
export async function checkMissedWorkout(): Promise<void> {
  const today = clock.today();
  const versions = await listWeekPlanVersions();
  const sugg = await allSuggestions();
  const makeups = sugg.filter((s) => s.type === 'missedWorkout' && s.status === 'approved').map((s) => ({ decidedOn: s.date, templateId: s.payload.templateId as string }));
  const schedule = weekSchedule(startOfWeek(today), (d) => dayPlanForDate(versions, d), makeups);
  const workouts = alive((await getDb().data('workouts').toArray()) as Workout[]);
  const completed = new Set(workouts.filter((w) => w.kind === 'regular' && w.status === 'completed').map((w) => w.date));
  const decidedDates = new Set(sugg.filter((s) => s.type === 'missedWorkout').map((s) => s.payload.missedDate as string));
  for (const w of workouts.filter((w) => w.status === 'skipped')) decidedDates.add(w.date);
  // רק מתחילת התוכנית: אחרי מבחן פתיחה או אימון ראשון, ולא לפני התוכנית השבועית הראשונה
  const started = workouts.filter((w) => w.status === 'completed').map((w) => w.date).sort()[0];
  const firstPlan = versions.map((v) => v.effectiveFrom).sort()[0];
  if (!started) return;
  const from = [started, firstPlan].filter(Boolean).sort().pop()!;
  for (const d of schedule.keys()) if (d < from) decidedDates.add(d);
  const missed = findMissed(today, schedule, completed, decidedDates);
  if (!missed) return;
  const templates = alive((await getDb().data('dayTemplates').toArray()) as DayTemplate[]);
  const name = templates.find((t) => t.id === missed.templateId)?.name ?? '';
  await createSuggestion({
    type: 'missedWorkout', refId: missed.date, date: today,
    payload: { missedDate: missed.date, templateId: missed.templateId, templateName: name },
    title: `האימון של ${formatDate(missed.date)} (${name}) הוחמץ`,
    reason: 'אישור = לבצע אותו היום, והאימונים הבאים נדחים ביום עד סוף השבוע. דחייה = לדלג, והאימון מסומן "דולג" (R-DAY-5)'
  });
}

/** R-REC-2: ביום אימון עם ציון מתחת ל-4 */
export async function checkRecoverySwap(): Promise<void> {
  const today = clock.today();
  const plan = await getEffectiveDayPlan(today);
  if (plan.dayType !== 'training') return;
  const log = await getDayLog(today);
  const score = log ? recoveryScore(log).score : null;
  if (!isLowRecovery(score)) return;
  if ((await allSuggestions()).some((s) => s.type === 'recoverySwap' && s.date === today)) return;
  await createSuggestion({
    type: 'recoverySwap', refId: today, date: today, payload: {},
    title: 'להחליף את היום ליום התאוששות פעילה?',
    reason: `ציון ההתאוששות היום ${score}, מתחת ל-4. אם תדחה, האימון ייבנה עם 2 סטים לכל תרגיל ו-RPE 7 (R-REC-2)`
  });
}

/** R-DL-1: הצעה מוקדמת לפי השבוע האחרון */
export async function checkEarlyDeload(): Promise<void> {
  const today = clock.today();
  const thisWeek = startOfWeek(today);
  const ctx = await getDeloadContext();
  if (!ctx.programStart || isDeloadWeek(today, ctx)) return;
  if ((await allSuggestions()).some((s) => s.type === 'deloadEarly' && s.payload.weekStart === thisWeek)) return;
  const last = addDays(thisWeek, -7);
  const [history, exs, logs] = await Promise.all([getHistory(), listExercises(), listDayLogs()]);
  const byId = new Map(exs.map((e) => [e.id, e]));
  const week = history.filter((h) => h.kind === 'regular' && !h.isDeload && h.role === 'work' && h.date >= last && h.date < thisWeek);
  if (!week.length) return;
  const rpes = week.flatMap((h) => h.sets.map((s) => s.rpe).filter((r): r is number => r !== null));
  const recs = logs.filter((l) => l.date >= last && l.date < thisWeek).map((l) => recoveryScore(l).score).filter((x): x is number => x !== null);
  const missed = week.filter((h) => byId.get(h.exerciseId) && evaluate(byId.get(h.exerciseId)!, h) === 'missed').length;
  const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
  const reasons = earlyDeloadReasons({ avgRpe: avg(rpes), avgRecovery: avg(recs), missedExercises: missed });
  if (!reasons.length) return;
  await createSuggestion({
    type: 'deloadEarly', refId: thisWeek, date: today, payload: { weekStart: thisWeek },
    title: 'שבוע הורדת עומס מוקדם, השבוע?',
    reason: `בשבוע שעבר: ${reasons.join(', ')} (R-DL-1)`
  });
}

/** R-GEN-3: קבוצה מחוץ ל-10–16 סטים שבועיים, שבועיים ברציפות */
export async function checkVolume(): Promise<void> {
  const today = clock.today();
  const [history, exs] = await Promise.all([getHistory(), listExercises()]);
  const byId = new Map(exs.map((e) => [e.id, e]));
  const out = volumeOutOfRange(history, byId, today);
  if (!out.length) return;
  const versions = await listWeekPlanVersions();
  const templates = alive((await getDb().data('dayTemplates').toArray()) as DayTemplate[]);
  const usedIds = new Set(Array.from({ length: 7 }, (_, i) => dayPlanForDate(versions, addDays(startOfWeek(today), i)).templateId));
  const week = startOfWeek(today);
  for (const o of out) {
    let pick: { t: DayTemplate; i: number } | null = null;
    for (const t of templates.filter((t) => usedIds.has(t.id))) {
      t.slots.forEach((sl, i) => {
        if (pick) return;
        const muscles = new Set(ladder(exs, sl.family).flatMap((e) => e.primaryMuscles));
        if (!muscles.has(o.muscle)) return;
        if (o.direction === 'add' && sl.sets < 4) pick = { t, i };
        if (o.direction === 'remove' && sl.sets > 1 && sl.priority !== 'main') pick = { t, i };
      });
    }
    if (!pick) continue;
    const p = pick as { t: DayTemplate; i: number };
    await createSuggestion({
      type: 'volume', refId: `${week}:${o.muscle}`, date: today,
      payload: { templateId: p.t.id, slotIndex: p.i, delta: o.direction === 'add' ? 1 : -1, muscle: o.muscle },
      title: `${o.direction === 'add' ? 'להוסיף' : 'להוריד'} סט ל${MUSCLES[o.muscle as MuscleId].name} (תבנית ${p.t.name})`,
      reason: `בשבועיים האחרונים: ${o.values[0]} ו-${o.values[1]} סטים, מחוץ ליעד 10–16 (R-GEN-3)`
    });
  }
}

export { canPostpone };
registerCheck(checkMissedWorkout);
registerCheck(checkRecoverySwap);
registerCheck(checkEarlyDeload);
registerCheck(checkVolume);
