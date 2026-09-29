// אימונים. בשלב 2: שמירת תוצאות מבחן הפתיחה כאימון (פרק 6)
import type { Exercise, ExerciseStatus, LocationId, SetLog, Workout, WorkoutExercise } from '../../domain/types';
import { levelIn } from '../../domain/calc/exercises';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase } from './base';
import { applyStatusChanges } from './exercises';

export interface TestSetInput {
  exercise: Exercise;
  family: string;
  /** בחד-צדדי: right ו-left. אחרת: value */
  value: number | null;
  right: number | null;
  left: number | null;
  status: ExerciseStatus;
}

async function todaysTestWorkout(location: LocationId): Promise<Workout> {
  const db = getDb();
  const today = clock.today();
  const existing = alive((await db.data('workouts').where('date').equals(today).toArray()) as Workout[]).find((w) => w.kind === 'test');
  if (existing) return existing;
  const now = clock.iso();
  const w: Workout = {
    ...newBase(),
    date: today,
    kind: 'test',
    dayType: null,
    templateName: 'מבחן פתיחה',
    location,
    isDeload: false,
    recoveryScore: null,
    status: 'completed',
    startedAt: now,
    endedAt: now,
    blockMinutes: {},
    feeling: null,
    notes: ''
  };
  await db.data('workouts').add(w);
  return w;
}

/** שומר את הסטים של משפחה אחת כחלק מאימון המבחן של היום, ומחיל את שינויי הסטטוס (באישור, E2) */
export async function saveTestFamily(location: LocationId, sets: TestSetInput[], changes: Record<string, ExerciseStatus>): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.data('workouts'), db.data('workoutExercises'), db.data('setLogs'), db.data('exercises')], async () => {
    const w = await todaysTestWorkout(location);
    const order = await db.data('workoutExercises').where('workoutId').equals(w.id).count();
    let i = 0;
    for (const s of sets) {
      const ex = s.exercise;
      const we: WorkoutExercise = {
        ...newBase(),
        workoutId: w.id,
        exerciseId: ex.id,
        exerciseName: ex.name,
        family: s.family,
        level: levelIn(ex, s.family) ?? 0,
        statusAtTime: s.status,
        role: 'work',
        targetSets: 1,
        targetMin: ex.targetMin,
        targetMax: ex.targetMax,
        tempo: ex.tempo,
        targetToday: 'סט מקסימלי',
        order: order + i++
      };
      await db.data('workoutExercises').add(we);
      const measure = (v: number | null) => (ex.measure === 'time' ? { reps: null, seconds: v } : { reps: v, seconds: null });
      const logs: SetLog[] = ex.unilateral
        ? [
            { ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'right', ...measure(s.right), load: null, rpe: null },
            { ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'left', ...measure(s.left), load: null, rpe: null }
          ]
        : [{ ...newBase(), workoutExerciseId: we.id, setNumber: 1, side: 'none', ...measure(s.value), load: null, rpe: null }];
      await db.data('setLogs').bulkAdd(logs);
    }
    await applyStatusChanges(changes);
  });
}

export async function listWorkouts(): Promise<Workout[]> {
  return alive((await getDb().data('workouts').toArray()) as Workout[]).sort((a, b) => b.date.localeCompare(a.date));
}

// ===== שלב 5: אימונים רגילים =====
import type { DayTemplate, Injury, ISODate as D, Profile, Side, Suggestion } from '../../domain/types';
import type { PastExercise, PastSet } from '../../domain/engine/history';
import { buildWorkout, type PlannedWorkout } from '../../domain/engine/buildWorkout';
import { progressionSuggestions } from '../../domain/rules/R-PRG';
import { calibrationSuggestion } from '../../domain/rules/R-BEG';
import { availableAt, ladder } from '../../domain/calc/exercises';
import { isBlocked } from '../../domain/rules/R-INJ';
import { recoveryScore } from '../../domain/rules/R-REC';
import { getEffectiveDayPlan, getFoundationInfo, isDeloadDate, lowRecoveryDeclined } from '../plan';
import { listExercises } from './exercises';
import { listInjuries } from './injuries';
import { getProfile } from './profile';
import { getDayLog } from './dayLogs';
import { createSuggestion } from './suggestions';
import { touched } from './base';

/** כל מה שבוצע באימונים שהושלמו (SetLog), לתרגילים */
export async function getHistory(): Promise<PastExercise[]> {
  const db = getDb();
  const workouts = alive((await db.data('workouts').toArray()) as Workout[]).filter((w) => w.status === 'completed');
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const wes = alive((await db.data('workoutExercises').toArray()) as WorkoutExercise[]).filter((we) => byId.has(we.workoutId));
  const sets = alive((await db.data('setLogs').toArray()) as SetLog[]);
  const setsBy = new Map<string, PastSet[]>();
  for (const s of sets) setsBy.set(s.workoutExerciseId, [...(setsBy.get(s.workoutExerciseId) ?? []), { setNumber: s.setNumber, side: s.side, reps: s.reps, seconds: s.seconds, load: s.load, rpe: s.rpe }]);
  return wes
    .map((we) => {
      const w = byId.get(we.workoutId)!;
      return {
        workoutId: w.id, date: w.date, kind: w.kind, isDeload: w.isDeload, location: w.location, exerciseId: we.exerciseId, family: we.family, level: we.level,
        role: we.role, statusAtTime: we.statusAtTime, targetMin: we.targetMin, targetMax: we.targetMax, sets: setsBy.get(we.id) ?? []
      } as PastExercise;
    })
    .filter((p) => p.sets.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  const w = (await getDb().data('workouts').get(id)) as Workout | undefined;
  return w && !w.deletedAt ? w : undefined;
}

export async function workoutsOn(date: D): Promise<Workout[]> {
  return alive((await getDb().data('workouts').where('date').equals(date).toArray()) as Workout[]);
}

/** אימון רגיל שבביצוע (אם יש) */
export async function activeWorkout(): Promise<Workout | undefined> {
  return alive((await getDb().data('workouts').toArray()) as Workout[]).find((w) => w.status === 'inProgress' && w.kind === 'regular');
}

export async function listWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
  return alive((await getDb().data('workoutExercises').where('workoutId').equals(workoutId).toArray()) as WorkoutExercise[]).sort((a, b) => a.order - b.order);
}

export async function listSets(weIds: string[]): Promise<SetLog[]> {
  if (!weIds.length) return [];
  return alive((await getDb().data('setLogs').where('workoutExerciseId').anyOf(weIds).toArray()) as SetLog[]);
}

/** R-INJ-3: פציעות שהחלימו, וכמה אימונים עם התרגילים שלהן נעשו מאז */
async function healedReturns(date: D, injuries: Injury[], history: PastExercise[]) {
  const exs = await listExercises();
  const byId = new Map(exs.map((e) => [e.id, e]));
  return injuries
    .filter((i) => i.status === 'healed' && i.healedDate && i.healedDate <= date)
    .map((injury) => {
      const asActive = { ...injury, status: 'active' as const };
      const workoutsWith = new Set(history.filter((h) => h.kind === 'regular' && h.date >= injury.healedDate! && byId.get(h.exerciseId) && isBlocked(byId.get(h.exerciseId)!, [asActive])).map((h) => h.workoutId));
      return { injury, workoutNumber: workoutsWith.size + 1 };
    })
    .filter((r) => r.workoutNumber <= 2);
}

/** בונה (בלי לשמור) את האימון של היום למיקום (R-GEN) */
export async function planWorkout(date: D, locationId: LocationId, likeLast = false): Promise<PlannedWorkout> {
  const db = getDb();
  const [plan, exercises, injuries, profile, history, deload, declined, foundation] = await Promise.all([
    getEffectiveDayPlan(date), listExercises(), listInjuries(), getProfile(), getHistory(), isDeloadDate(date), lowRecoveryDeclined(date), getFoundationInfo(date)
  ]);
  const templates = alive((await db.data('dayTemplates').toArray()) as DayTemplate[]);
  const template = templates.find((t) => t.id === plan.templateId) ?? null;
  const location = (profile as Profile).locations.find((l) => l.id === locationId)!;
  let preferIds: string[] | undefined;
  if (likeLast && template) {
    const prev = alive((await db.data('workouts').toArray()) as Workout[])
      .filter((w) => w.kind === 'regular' && w.status === 'completed' && w.templateName === template.name && w.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (prev) preferIds = (await listWorkoutExercises(prev.id)).map((we) => we.exerciseId);
  }
  return buildWorkout({
    date, plan, template, exercises, injuries, location, history, isDeload: deload, lowRecoveryDeclined: declined,
    healedReturns: await healedReturns(date, injuries, history), preferIds, foundationWeek: foundation?.week ?? null
  });
}

/** התחלת אימון: שמירת המבנה כתמונת מצב (E1) */
export async function startWorkout(date: D, locationId: LocationId, planned: PlannedWorkout): Promise<Workout> {
  const db = getDb();
  const log = await getDayLog(date);
  const now = clock.iso();
  const w: Workout = {
    ...newBase(), date, kind: 'regular', dayType: planned.dayType, templateName: planned.templateName, location: locationId, isDeload: planned.isDeload,
    recoveryScore: log ? recoveryScore(log).score : null, status: 'inProgress', startedAt: now, endedAt: null, blockMinutes: {}, feeling: null, notes: '',
    restEndsAt: null,
    plan: { blocks: planned.blocks, strengthSec: planned.strengthSec, totalSec: planned.totalSec, totalLimitSec: planned.totalLimitSec, skipped: planned.skipped, notes: planned.notes }
  };
  await db.transaction('rw', db.data('workouts'), db.data('workoutExercises'), async () => {
    await db.data('workouts').add(w);
    let order = 0;
    for (const it of planned.strength) {
      const we: WorkoutExercise = {
        ...newBase(), workoutId: w.id, exerciseId: it.exercise.id, exerciseName: it.exercise.name, family: it.family,
        level: it.exercise.families.find((f) => f.family === it.family)?.level ?? 0, statusAtTime: it.exercise.status, role: it.role,
        targetSets: it.sets, targetMin: it.exercise.targetMin, targetMax: it.exercise.targetMax, tempo: it.tempo, targetToday: it.targetText,
        order: order++, targetValue: it.targetValue, priority: it.priority, rpeTarget: it.rpeTarget, restSec: it.restSec, note: it.note
      };
      await db.data('workoutExercises').add(we);
    }
  });
  return w;
}

export interface SetInput {
  setNumber: number;
  side: Side;
  reps: number | null;
  seconds: number | null;
  load: string | null;
  rpe: number | null;
}

/** רישום סט. RPE חובה בסט עבודה (R-PRG-1) */
export async function logSet(weId: string, s: SetInput): Promise<SetLog> {
  const we = (await getDb().data('workoutExercises').get(weId)) as WorkoutExercise;
  if (we.role === 'work' && (s.rpe === null || s.rpe < 1 || s.rpe > 10)) throw new Error('חסר RPE (1–10)');
  if ((s.reps ?? s.seconds) === null) throw new Error('חסרה תוצאה');
  const rec: SetLog = { ...newBase(), workoutExerciseId: weId, ...s };
  await getDb().data('setLogs').add(rec);
  return rec;
}

export async function deleteSet(id: string): Promise<void> {
  const cur = (await getDb().data('setLogs').get(id)) as SetLog | undefined;
  if (cur) await getDb().data('setLogs').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreSet(id: string): Promise<void> {
  const cur = (await getDb().data('setLogs').get(id)) as SetLog | undefined;
  if (cur) await getDb().data('setLogs').put(touched(cur, { deletedAt: null }));
}

/** מנוחה: שומרים את שעת הסיום, והטיימר מחושב ממנה (3.6) */
export async function setRestEnd(workoutId: string, endsAt: number | null): Promise<void> {
  const w = await getWorkout(workoutId);
  if (w) await getDb().data('workouts').put(touched(w, { restEndsAt: endsAt }));
}

export async function setBlockMinutes(workoutId: string, key: string, minutes: number): Promise<void> {
  const w = await getWorkout(workoutId);
  if (w) await getDb().data('workouts').put(touched(w, { blockMinutes: { ...w.blockMinutes, [key]: minutes } }));
}

export async function cancelWorkout(workoutId: string): Promise<void> {
  const w = await getWorkout(workoutId);
  if (w) await getDb().data('workouts').put(touched(w, { deletedAt: clock.iso() }));
}

export async function restoreWorkout(workoutId: string): Promise<void> {
  const w = (await getDb().data('workouts').get(workoutId)) as Workout | undefined;
  if (w) await getDb().data('workouts').put(touched(w, { deletedAt: null }));
}

/** סיום: שמירה, איפוס "מהקצה התחתון", והצעות התקדמות (E2) */
export async function finishWorkout(workoutId: string, fin: { feeling: number | null; notes: string }): Promise<Suggestion[]> {
  const db = getDb();
  const w = await getWorkout(workoutId);
  if (!w) throw new Error('האימון לא נמצא');
  await db.data('workouts').put(touched(w, { status: 'completed', endedAt: clock.iso(), feeling: fin.feeling, notes: fin.notes, restEndsAt: null }));
  const wes = await listWorkoutExercises(workoutId);
  const done = await listSets(wes.map((x) => x.id));
  const exs = await listExercises();
  const byId = new Map(exs.map((e) => [e.id, e]));
  for (const we of wes) {
    const ex = byId.get(we.exerciseId);
    if (ex?.restartAtMin && done.some((s) => s.workoutExerciseId === we.id)) await db.data('exercises').put(touched(ex, { restartAtMin: false }));
  }
  return evaluateProgression(workoutId);
}

export async function evaluateProgression(workoutId: string): Promise<Suggestion[]> {
  const w = await getWorkout(workoutId);
  if (!w || w.isDeload || w.kind !== 'regular') return [];
  const [wes, exs, history, profile, foundation] = await Promise.all([listWorkoutExercises(workoutId), listExercises(), getHistory(), getProfile(), getFoundationInfo(w.date)]);
  const byId = new Map(exs.map((e) => [e.id, e]));
  const locations = (profile?.locations ?? []).filter((l) => l.enabled);
  const created: Suggestion[] = [];
  for (const we of wes.filter((x) => x.role === 'work')) {
    const ex = byId.get(we.exerciseId);
    if (!ex) continue;
    const lad = ladder(exs, we.family);
    const lvl = ex.families.find((f) => f.family === we.family)?.level ?? we.level;
    const next = lad.filter((e) => e.families.some((f) => f.family === we.family && f.level === lvl + 1)).map((e) => ({ ex: e, availableSomewhere: locations.some((l) => availableAt(e, l)) }));
    const previous = lad.find((e) => e.families.some((f) => f.family === we.family && f.level === lvl - 1)) ?? null;
    const mine = history.filter((h) => h.exerciseId === ex.id);
    const sugg = progressionSuggestions(ex, we.family, mine, { next, previous });
    // R-BEG-7: כיול באימון הראשון ביסודות
    if (foundation && !sugg.some((s) => s.type === 'advance' || s.type === 'regress')) {
      const cal = calibrationSuggestion(ex, we.family, mine, next);
      if (cal) sugg.push(cal);
    }
    for (const s of sugg) {
      const c = await createSuggestion({ type: s.type, refId: ex.id, payload: s.payload, title: s.title, reason: s.reason });
      if (c) created.push(c);
    }
  }
  return created;
}
