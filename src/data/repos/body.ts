// מדידות, סטים של תמונות ואבני דרך (4.2, 4.5)
import type { BodyMeasurement, Circumference, ISODate, Milestone, ProgressPhotoSet } from '../../domain/types';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';
import { getProfile } from './profile';
import { refreshToday } from './dayLogs';
import { listPhotos, savePhoto, type PhotoRow } from './photos';

export interface MeasurementInput {
  date: ISODate;
  weightKg: number | null;
  circ: Partial<Record<Circumference, number | null>>;
  notes: string;
}

export async function listMeasurements(): Promise<BodyMeasurement[]> {
  return alive((await getDb().data('bodyMeasurements').toArray()) as BodyMeasurement[]).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** גובה ומין נשמרים ברגע המדידה (📸), כך ששינוי בפרופיל לא משנה אחוז שומן היסטורי */
export async function saveMeasurement(input: MeasurementInput, id?: string): Promise<BodyMeasurement> {
  if (input.date > clock.today()) throw new Error('תאריך בעתיד');
  const vals = [input.weightKg, ...Object.values(input.circ)].filter((v) => v !== null && v !== undefined) as number[];
  if (!vals.length) throw new Error('צריך לפחות ערך אחד');
  if (vals.some((v) => !(v > 0 && v < 400))) throw new Error('ערך לא סביר');
  const db = getDb();
  let rec: BodyMeasurement;
  if (id) {
    const cur = (await db.data('bodyMeasurements').get(id)) as BodyMeasurement;
    rec = touched(cur, { ...input, circ: { ...input.circ } });
    await db.data('bodyMeasurements').put(rec);
  } else {
    const p = await getProfile();
    rec = { ...newBase(), ...input, circ: { ...input.circ }, heightCm: p?.heightCm ?? null, sex: p?.sex ?? null };
    await db.data('bodyMeasurements').add(rec);
  }
  await refreshToday();
  return rec;
}

export async function deleteMeasurement(id: string): Promise<void> {
  const cur = (await getDb().data('bodyMeasurements').get(id)) as BodyMeasurement | undefined;
  if (cur) await getDb().data('bodyMeasurements').put(touched(cur, { deletedAt: clock.iso() }));
  await refreshToday();
}

export async function restoreMeasurement(id: string): Promise<void> {
  const cur = (await getDb().data('bodyMeasurements').get(id)) as BodyMeasurement | undefined;
  if (cur) await getDb().data('bodyMeasurements').put(touched(cur, { deletedAt: null }));
  await refreshToday();
}

// ===== תמונות התקדמות =====
export async function listPhotoSets(): Promise<ProgressPhotoSet[]> {
  return alive((await getDb().data('photoSets').toArray()) as ProgressPhotoSet[]).sort((a, b) => a.date.localeCompare(b.date));
}

/** הסט הראשון הוא סט הבסיס (R-PHOTO-2) */
export async function createPhotoSet(date: ISODate, measurementId: string | null, blobs: Partial<Record<'front' | 'back' | 'side', Blob>>): Promise<ProgressPhotoSet> {
  const entries = Object.entries(blobs).filter(([, b]) => !!b) as ['front' | 'back' | 'side', Blob][];
  if (!entries.length) throw new Error('אין תמונות');
  const db = getDb();
  const isBaseline = (await listPhotoSets()).length === 0;
  const set: ProgressPhotoSet = { ...newBase(), measurementId, date, isBaseline };
  await db.data('photoSets').add(set);
  for (const [view, blob] of entries) await savePhoto(blob, { photoSetId: set.id, mealId: null, view, date });
  return set;
}

export async function photosBySet(): Promise<Map<string, PhotoRow[]>> {
  const out = new Map<string, PhotoRow[]>();
  for (const p of await listPhotos()) if (p.photoSetId) out.set(p.photoSetId, [...(out.get(p.photoSetId) ?? []), p]);
  return out;
}

/** R-PHOTO-2: סט הבסיס לא נמחק לעולם */
export async function deletePhotoSet(id: string): Promise<void> {
  const db = getDb();
  const set = (await db.data('photoSets').get(id)) as ProgressPhotoSet | undefined;
  if (!set) return;
  if (set.isBaseline) throw new Error('סט הבסיס לא נמחק לעולם (R-PHOTO-2)');
  const now = clock.iso();
  await db.data('photoSets').put(touched(set, { deletedAt: now }));
  for (const p of (await photosBySet()).get(id) ?? []) await db.data('photos').put({ ...p, deletedAt: now, updatedAt: now });
}

// ===== אבני דרך =====
export async function listMilestones(): Promise<Milestone[]> {
  return alive((await getDb().data('milestones').toArray()) as Milestone[]);
}

export async function saveMilestone(input: Pick<Milestone, 'name' | 'requirements' | 'targetDate'>, id?: string): Promise<Milestone> {
  if (!input.name.trim()) throw new Error('חסר שם');
  if (!input.requirements.length || input.requirements.some((r) => !r.exerciseId || !(r.value > 0))) throw new Error('דרישה לא תקינה');
  const db = getDb();
  if (id) {
    const cur = (await db.data('milestones').get(id)) as Milestone;
    const next = touched(cur, input);
    await db.data('milestones').put(next);
    return next;
  }
  const rec: Milestone = { ...newBase(), ...input, achieved: false, completedDate: null };
  await db.data('milestones').add(rec);
  return rec;
}

/** R-BODY-6: סימון 🏆 באישור */
export async function setMilestoneAchieved(id: string, achieved: boolean): Promise<void> {
  const cur = (await getDb().data('milestones').get(id)) as Milestone | undefined;
  if (cur) await getDb().data('milestones').put(touched(cur, { achieved, completedDate: achieved ? clock.today() : null }));
}

export async function deleteMilestone(id: string): Promise<void> {
  const cur = (await getDb().data('milestones').get(id)) as Milestone | undefined;
  if (cur) await getDb().data('milestones').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreMilestone(id: string): Promise<void> {
  const cur = (await getDb().data('milestones').get(id)) as Milestone | undefined;
  if (cur) await getDb().data('milestones').put(touched(cur, { deletedAt: null }));
}
