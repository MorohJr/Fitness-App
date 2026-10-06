// מבחן פתיחה כאימון רגיל (R-TST): התחלה, סט, החלפה, מחיקה וסיום עם אישור (E2)
import type { Exercise, ExerciseStatus, Injury, LocationId, Profile, SetLog, Workout, WorkoutExercise } from '../../domain/types';
import type { FamilyId } from '../../domain/families';
import { availableAt, levelIn } from '../../domain/calc/exercises';
import { isBlocked } from '../../domain/rules/R-INJ';
import { MIN_PER_FAMILY, REST_BETWEEN_FAMILIES_SEC, REST_IN_FAMILY_SEC, suggestStart, testChanges, testOrder, testStep, testWarmup, type Usable } from '../../domain/rules/R-TST';
import { testValue } from '../../domain/rules/opening-test';
import { getDb } from '../db';
import { clock } from '../clock';
import { newBase, touched } from './base';
import { applyStatusChanges, listExercises } from './exercises';
import { listInjuries } from './injuries';
import { getProfile } from './profile';
import { activeWorkout, listSets, listWorkoutExercises } from './workouts';

export function usableAt(profile: Profile | undefined, location: LocationId, injuries: Injury[]): Usable {
  const loc = profile?.locations.find((l) => l.id === location);
  return (e) => !!loc && availableAt(e, loc) && !isBlocked(e, injuries);
}

async function context(location: LocationId) {
  const [exercises, injuries, profile] = await Promise.all([listExercises(), listInjuries(), getProfile()]);
  return { exercises, usable: usableAt(profile, location, injuries) };
}

function testWe(workoutId: string, ex: Exercise, family: string, order: number): WorkoutExercise {
  return {
    ...newBase(), workoutId, exerciseId: ex.id, exerciseName: ex.name, family, level: levelIn(ex, family) ?? 0,
    // במבחן: לפני הסט הסטטוס הקודם, אחרי הסט תוצאת המבחן (כמו במבחנים קודמים, R-RANK)
    statusAtTime: ex.status, role: 'work', targetSets: 1, targetMin: ex.targetMin, targetMax: ex.targetMax, tempo: ex.tempo,
    targetToday: 'סט מקסימלי', order, restSec: REST_IN_FAMILY_SEC, note: null
  };
}

/** R-TST-1: יוצר אימון מבחן בביצוע. תרגיל אחד לכל משפחה, בסדר R-TST-2 */
export async function startTest(o: { families: FamilyId[]; location: LocationId; foundation: boolean }): Promise<Workout> {
  if (await activeWorkout()) throw new Error('יש אימון בביצוע. סיים או בטל אותו קודם');
  const { exercises, usable } = await context(o.location);
  const picks = testOrder(o.families)
    .map((f) => ({ f, ex: suggestStart(exercises, f, usable, o.foundation) }))
    .filter((p): p is { f: FamilyId; ex: Exercise } => !!p.ex);
  if (!picks.length) throw new Error('אין תרגיל זמין במיקום הזה');
  const now = clock.iso();
  const warm = testWarmup(exercises, usable, picks[0].ex);
  const w: Workout = {
    ...newBase(), date: clock.today(), kind: 'test', dayType: null, templateName: o.foundation ? 'בדיקת רמה' : 'מבחן פתיחה', location: o.location,
    isDeload: false, recoveryScore: null, status: 'inProgress', startedAt: now, endedAt: null, blockMinutes: {}, feeling: null, notes: '', restEndsAt: null,
    plan: { blocks: [warm], totalLimitSec: (warm.minutes + picks.length * MIN_PER_FAMILY) * 60, foundation: o.foundation }
  };
  const db = getDb();
  await db.transaction('rw', db.data('workouts'), db.data('workoutExercises'), async () => {
    await db.data('workouts').add(w);
    let i = 0;
    for (const p of picks) await db.data('workoutExercises').add(testWe(w.id, p.ex, p.f, i++));
  });
  return w;
}

async function familyTries(we: WorkoutExercise): Promise<{ wes: WorkoutExercise[]; sets: SetLog[] }> {
  const wes = (await listWorkoutExercises(we.workoutId)).filter((x) => x.family === we.family);
  return { wes, sets: await listSets(wes.map((x) => x.id)) };
}

export interface TestSetResult {
  status: ExerciseStatus;
  message: string;
  /** נוסף תרגיל לרמה נוספת */
  added: boolean;
}

/** R-TST-5: רישום הסט המקסימלי, התוצאה, ותרגיל נוסף אם צריך */
export async function logTestSet(weId: string, input: { value: number | null; right: number | null; left: number | null }): Promise<TestSetResult> {
  const db = getDb();
  const we = (await db.data('workoutExercises').get(weId)) as WorkoutExercise;
  const w = (await db.data('workouts').get(we.workoutId)) as Workout;
  const { exercises, usable } = await context(w.location);
  const ex = exercises.find((e) => e.id === we.exerciseId);
  if (!ex) throw new Error('התרגיל לא נמצא');
  const v = testValue(input.right, input.left, input.value, ex.unilateral);
  if (v === null || v < 0) throw new Error(ex.unilateral ? 'הזן תוצאה לשני הצדדים' : 'הזן תוצאה');
  const { wes, sets } = await familyTries(we);
  if (sets.some((s) => s.workoutExerciseId === we.id)) throw new Error('בתרגיל הזה כבר נעשה הסט');
  const before = wes.filter((x) => x.order < we.order && sets.some((s) => s.workoutExerciseId === x.id)).map((x) => ({ exerciseId: x.exerciseId, level: x.level }));
  const step = testStep(exercises, we.family, ex, v, before, usable);

  const all = await listWorkoutExercises(w.id);
  const hasNextFamily = all.some((x) => x.order > we.order && x.family !== we.family);
  const measure = (val: number | null) => (ex.measure === 'time' ? { reps: null, seconds: val } : { reps: val, seconds: null });
  const base = { workoutExerciseId: we.id, setNumber: 1, load: null, rpe: null };
  const logs: SetLog[] = ex.unilateral
    ? [{ ...newBase(), ...base, side: 'right', ...measure(input.right) }, { ...newBase(), ...base, side: 'left', ...measure(input.left) }]
    : [{ ...newBase(), ...base, side: 'none', ...measure(input.value) }];

  await db.transaction('rw', db.data('workouts'), db.data('workoutExercises'), db.data('setLogs'), async () => {
    await db.data('setLogs').bulkAdd(logs);
    await db.data('workoutExercises').put(touched(we, { statusAtTime: step.status, note: step.message }));
    if (step.next) {
      // מפנים מקום מיד אחרי התרגיל הנוכחי
      for (const x of all.filter((x) => x.order > we.order)) await db.data('workoutExercises').put(touched(x, { order: x.order + 1 }));
      await db.data('workoutExercises').add(testWe(w.id, step.next, we.family, we.order + 1));
    }
    const rest = step.next ? REST_IN_FAMILY_SEC : hasNextFamily ? REST_BETWEEN_FAMILIES_SEC : 0;
    await db.data('workouts').put(touched(w, { restEndsAt: rest ? Date.now() + rest * 1000 : null }));
  });
  return { status: step.status, message: step.message, added: !!step.next };
}

/** מחיקת הסט: גם הבדיקות שנוספו אחריו באותה משפחה נמחקות (R-TST-5) */
export async function deleteTestSet(weId: string): Promise<void> {
  const db = getDb();
  const we = (await db.data('workoutExercises').get(weId)) as WorkoutExercise;
  const ex = (await listExercises()).find((e) => e.id === we.exerciseId);
  const { wes, sets } = await familyTries(we);
  const later = wes.filter((x) => x.order > we.order);
  const now = clock.iso();
  await db.transaction('rw', db.data('workoutExercises'), db.data('setLogs'), async () => {
    for (const s of sets.filter((s) => s.workoutExerciseId === we.id || later.some((x) => x.id === s.workoutExerciseId))) await db.data('setLogs').put(touched(s, { deletedAt: now }));
    for (const x of later) await db.data('workoutExercises').put(touched(x, { deletedAt: now }));
    await db.data('workoutExercises').put(touched(we, { statusAtTime: ex?.status ?? null, note: null }));
  });
}

/** R-TST-3: "החלף תרגיל" כל עוד לא נעשה סט */
export async function swapTestExercise(weId: string, exerciseId: string): Promise<void> {
  const db = getDb();
  const we = (await db.data('workoutExercises').get(weId)) as WorkoutExercise;
  if ((await listSets([we.id])).length) throw new Error('אי אפשר להחליף אחרי שנעשה סט');
  const ex = (await listExercises()).find((e) => e.id === exerciseId);
  if (!ex) throw new Error('התרגיל לא נמצא');
  const fresh = testWe(we.workoutId, ex, we.family, we.order);
  await db.data('workoutExercises').put(touched(we, {
    exerciseId: ex.id, exerciseName: ex.name, level: fresh.level, statusAtTime: ex.status, targetMin: ex.targetMin, targetMax: ex.targetMax, tempo: ex.tempo
  }));
}

export interface FamilyReview {
  family: string;
  tried: { we: WorkoutExercise; sets: SetLog[] }[];
  changes: Record<string, ExerciseStatus>;
}

/** R-TST-6: מה נבדק ומה משתנה, לכל משפחה באימון */
export async function testReview(workoutId: string): Promise<FamilyReview[]> {
  const wes = await listWorkoutExercises(workoutId);
  const [sets, exercises] = await Promise.all([listSets(wes.map((x) => x.id)), listExercises()]);
  const families = [...new Set(wes.map((x) => x.family))];
  return families.map((family) => {
    const tried = wes.filter((x) => x.family === family).map((we) => ({ we, sets: sets.filter((s) => s.workoutExerciseId === we.id) }));
    const results = tried.filter((t) => t.sets.length).map((t) => ({ exerciseId: t.we.exerciseId, level: t.we.level, status: t.we.statusAtTime as ExerciseStatus }));
    return { family, tried, changes: results.length ? testChanges(exercises, family, results) : {} };
  });
}

/** R-TST-6: שמירה וסיום. רק משפחות מאושרות משנות סטטוס. תרגילים בלי סט נמחקים מהאימון */
export async function finishTest(workoutId: string, approved: string[], notes = ''): Promise<void> {
  const db = getDb();
  const review = await testReview(workoutId);
  const w = (await db.data('workouts').get(workoutId)) as Workout;
  const changes: Record<string, ExerciseStatus> = {};
  for (const r of review) if (approved.includes(r.family)) Object.assign(changes, r.changes);
  const now = clock.iso();
  await db.transaction('rw', [db.data('workouts'), db.data('workoutExercises'), db.data('exercises')], async () => {
    for (const r of review) for (const t of r.tried) if (!t.sets.length) await db.data('workoutExercises').put(touched(t.we, { deletedAt: now }));
    await db.data('workouts').put(touched(w, { status: 'completed', endedAt: now, notes, restEndsAt: null }));
    await applyStatusChanges(changes);
  });
}

