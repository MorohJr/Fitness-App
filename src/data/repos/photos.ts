// תמונות: נשמרות כ-blob בטבלת photos, ונכנסות לגיבוי כ-JPEG (3.5)
import { getDb } from '../db';
import { clock } from '../clock';
import { newBase } from './base';

export interface PhotoRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  photoSetId: string | null;
  mealId: string | null;
  view: 'front' | 'back' | 'side' | 'meal';
  date: string | null;
  blob: Blob;
}

export async function savePhoto(blob: Blob, meta: Pick<PhotoRow, 'photoSetId' | 'mealId' | 'view' | 'date'>): Promise<string> {
  const row: PhotoRow = { ...newBase(), ...meta, blob };
  await getDb().data('photos').add(row);
  return row.id;
}

export async function getPhoto(id: string): Promise<PhotoRow | undefined> {
  const r = (await getDb().data('photos').get(id)) as PhotoRow | undefined;
  return r && !r.deletedAt ? r : undefined;
}

export async function listPhotos(): Promise<PhotoRow[]> {
  return ((await getDb().data('photos').toArray()) as PhotoRow[]).filter((p) => !p.deletedAt);
}

/** מחיקת תמונה: מסמנים, והנתונים עצמם נמחקים בניקוי של 90 יום */
export async function deletePhoto(id: string): Promise<void> {
  const r = (await getDb().data('photos').get(id)) as PhotoRow | undefined;
  if (r) await getDb().data('photos').put({ ...r, deletedAt: clock.iso(), updatedAt: clock.iso() });
}

export async function restorePhoto(id: string): Promise<void> {
  const r = (await getDb().data('photos').get(id)) as PhotoRow | undefined;
  if (r) await getDb().data('photos').put({ ...r, deletedAt: null, updatedAt: clock.iso() });
}
