// מאגר התרגילים (4.2)
import type { Exercise, ExerciseStatus, FamilyLevel } from '../../domain/types';
import { FAMILY_META, type FamilyId } from '../../domain/families';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';
import { buildSeedExercises } from '../seed/exercises';

export async function listExercises(): Promise<Exercise[]> {
  const rows = (await getDb().data('exercises').toArray()) as Exercise[];
  return alive(rows).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  const e = (await getDb().data('exercises').get(id)) as Exercise | undefined;
  return e && !e.deletedAt ? e : undefined;
}

/** טעינת המאגר ההתחלתי, רק תרגילים שעוד לא קיימים (לא נוגע בקיימים) */
export async function seedExercises(): Promise<number> {
  const db = getDb();
  const existing = new Set((await db.data('exercises').toCollection().primaryKeys()) as string[]);
  const now = clock.iso();
  const missing = buildSeedExercises()
    .filter((e) => !existing.has(e.id))
    .map((e) => ({ ...e, createdAt: now, updatedAt: now, deletedAt: null }));
  if (missing.length) await db.data('exercises').bulkAdd(missing);
  return missing.length;
}

export type ExerciseEdit = Partial<Omit<Exercise, 'id' | 'createdAt' | 'familyIds' | 'custom' | 'status'>>;

/** עריכת תרגיל. לא משנה אימונים שעברו (שומרים תמונת מצב, E1) */
export async function updateExercise(id: string, patch: ExerciseEdit): Promise<Exercise> {
  const ex = await getExercise(id);
  if (!ex) throw new Error('התרגיל לא נמצא');
  const families = patch.families ?? ex.families;
  const next = touched<Exercise>(ex, { ...patch, families, familyIds: families.map((f) => f.family) } as Partial<Exercise>);
  await getDb().data('exercises').put(next);
  return next;
}

/** שינוי סטטוס ידני, באישור (E2) */
export async function setExerciseStatus(id: string, status: ExerciseStatus): Promise<void> {
  const ex = await getExercise(id);
  if (!ex) throw new Error('התרגיל לא נמצא');
  if (ex.status === null) throw new Error('לתרגיל הזה אין סטטוס');
  await getDb().data('exercises').put(touched(ex, { status }));
}

/** החלת כמה שינויי סטטוס יחד (מבחן פתיחה) */
export async function applyStatusChanges(changes: Record<string, ExerciseStatus>): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.data('exercises'), async () => {
    for (const [id, status] of Object.entries(changes)) {
      const ex = (await db.data('exercises').get(id)) as Exercise | undefined;
      if (ex) await db.data('exercises').put(touched(ex, { status }));
    }
  });
}

export interface NewExerciseInput {
  name: string;
  families: FamilyLevel[];
  measure: Exercise['measure'];
  unilateral: boolean;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  targetMin: number;
  targetMax: number;
  restSec: number;
  tempo: string;
  cues: string[];
  safety: string;
  locations?: Exercise['locations'];
  secondsPerSet?: number;
}

/** תרגיל שלי */
export async function addCustomExercise(input: NewExerciseInput): Promise<Exercise> {
  if (!input.name.trim()) throw new Error('חסר שם');
  if (!input.families.length) throw new Error('צריך לפחות משפחה אחת');
  const fam0 = FAMILY_META[input.families[0].family as FamilyId];
  const ex: Exercise = {
    ...newBase(),
    ...input,
    name: input.name.trim(),
    familyIds: input.families.map((f) => f.family),
    status: fam0?.kind === 'pool' ? null : 'red',
    category: fam0?.category ?? 'push',
    locations: input.locations?.length ? input.locations : ['home', 'outdoor'],
    secondsPerSet: input.secondsPerSet ?? (input.measure === 'time' ? input.targetMax : Math.round(((input.targetMin + input.targetMax) / 2) * 5)),
    custom: true
  };
  await getDb().data('exercises').add(ex);
  return ex;
}

/** מחיקה רכה, רק לתרגיל שלי */
export async function deleteCustomExercise(id: string): Promise<void> {
  const ex = await getExercise(id);
  if (!ex?.custom) throw new Error('אפשר למחוק רק תרגיל שהוספת');
  await getDb().data('exercises').put(touched(ex, { deletedAt: clock.iso() }));
}

export async function restoreExercise(id: string): Promise<void> {
  const ex = (await getDb().data('exercises').get(id)) as Exercise | undefined;
  if (ex) await getDb().data('exercises').put(touched(ex, { deletedAt: null }));
}
