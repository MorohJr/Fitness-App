// גיבוי: ייצוא וייבוא ZIP, וביטול ייבוא (3.5)
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { DATA_TABLE_NAMES, SCHEMA_VERSION, getDb, type DataTableName } from '../db';
import { clock } from '../clock';
import { setMeta } from '../repos/meta';
import { clearTestSession } from '../repos/testSession';
import { migrateBackup, type BackupData } from './migrate';
import { assertNotDemo, isDemoMode } from '../demo/state';
import { resetOnboarding } from '../onboarding';

type Row = Record<string, unknown>;
const UNDO_KEY = 'preImport';

async function readAllTables(withBlobs: boolean): Promise<Record<string, Row[]>> {
  const db = getDb();
  const out: Record<string, Row[]> = {};
  for (const name of DATA_TABLE_NAMES) {
    const rows = (await db.data(name).toArray()) as Row[];
    out[name] = name === 'photos' && !withBlobs ? rows.map(({ blob: _b, ...r }) => r) : rows;
  }
  return out;
}

/** יוצר קובץ ZIP: data.json, ו-photos/ אם נבחר "כולל תמונות" */
export async function exportBackup(opts: { includePhotos: boolean }): Promise<{ bytes: Uint8Array; fileName: string }> {
  const db = getDb();
  const tables = await readAllTables(false);
  const data: BackupData = {
    app: 'fitness-app',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: clock.iso(),
    includesPhotos: opts.includePhotos,
    tables
  };
  const files: Zippable = { 'data.json': strToU8(JSON.stringify(data)) };
  if (opts.includePhotos) {
    const photos = (await db.data('photos').toArray()) as { id: string; blob?: Blob }[];
    for (const p of photos) {
      if (p.blob) files[`photos/${p.id}.jpg`] = [new Uint8Array(await p.blob.arrayBuffer()), { level: 0 }];
    }
  }
  const stamp = clock.today();
  // R-DEMO-4: קובץ של הדגמה מסומן בשם
  const demo = (await isDemoMode()) ? '-demo' : '';
  return { bytes: zipSync(files, { level: 6 }), fileName: `fitness-backup${demo}-${stamp}.zip` };
}

/** נרשם אחרי שהקובץ נשמר או שותף (לתזכורת הגיבוי, 3.4) */
export async function markExported(): Promise<void> {
  await setMeta('lastExportAt', clock.iso());
}

export interface ImportPreview {
  data: BackupData;
  photoFiles: Record<string, Uint8Array>;
  counts: Record<string, number>;
}

/** קריאה ובדיקה של קובץ, בלי לשנות כלום. מציג מה ייובא לפני האישור */
export function readBackup(bytes: Uint8Array): ImportPreview {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error('הקובץ אינו קובץ גיבוי תקין (ZIP)');
  }
  if (!files['data.json']) throw new Error('בקובץ אין data.json');
  let raw: BackupData;
  try {
    raw = JSON.parse(strFromU8(files['data.json']));
  } catch {
    throw new Error('data.json פגום');
  }
  if (raw.app !== 'fitness-app' || typeof raw.schemaVersion !== 'number' || typeof raw.tables !== 'object') {
    throw new Error('זה לא גיבוי של האפליקציה הזו');
  }
  const data = migrateBackup(raw);
  const photoFiles: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    const m = /^photos\/(.+)\.jpg$/.exec(path);
    if (m) photoFiles[m[1]] = content;
  }
  const counts: Record<string, number> = {};
  for (const name of DATA_TABLE_NAMES) counts[name] = (data.tables[name] ?? []).length;
  return { data, photoFiles, counts };
}

/** כותב את כל הטבלאות. photos מוחלף רק אם הוא ברשימה */
async function writeTables(tables: Record<string, Row[]>, replacePhotos: boolean): Promise<void> {
  const db = getDb();
  const names = DATA_TABLE_NAMES.filter((n) => n !== 'photos' || replacePhotos);
  await db.transaction('rw', names.map((n) => db.data(n)), async () => {
    for (const name of names) {
      await db.data(name).clear();
      const rows = tables[name] ?? [];
      if (rows.length) await db.data(name).bulkAdd(rows);
    }
  });
}

/**
 * ייבוא: שומר את המצב הנוכחי (לביטול), ומחליף את כל הנתונים.
 * ייבוא בלי תמונות לא מוחק תמונות קיימות.
 */
export async function importBackup(preview: ImportPreview): Promise<void> {
  await assertNotDemo('ייבוא');
  const db = getDb();
  const snapshot = await readAllTables(true);
  await db.undo.put({ key: UNDO_KEY, createdAt: clock.iso(), tables: snapshot, reason: 'import' } as never);

  const tables: Record<string, Row[]> = {};
  for (const name of DATA_TABLE_NAMES) tables[name] = (preview.data.tables[name] ?? []).map((r) => ({ ...r }));
  const hasPhotos = preview.data.includesPhotos;
  if (hasPhotos) {
    tables.photos = tables.photos
      .filter((r) => preview.photoFiles[r.id as string])
      .map((r) => ({ ...r, blob: new Blob([preview.photoFiles[r.id as string] as BlobPart], { type: 'image/jpeg' }) }));
  }
  await writeTables(tables, hasPhotos);
  // R-TST-6: מבחן פתוח לא שורד ייבוא
  await clearTestSession();
}

export type UndoReason = 'import' | 'delete';

export async function hasUndoImport(): Promise<{ createdAt: string; reason: UndoReason } | null> {
  const row = await getDb().undo.get(UNDO_KEY);
  return row ? { createdAt: row.createdAt, reason: (row as { reason?: UndoReason }).reason ?? 'import' } : null;
}

/** מחיקת כל הנתונים (3.5). המצב הקודם נשמר, ואפשר לבטל */
export async function deleteAllData(): Promise<void> {
  await assertNotDemo('מחיקת כל הנתונים');
  const db = getDb();
  const snapshot = await readAllTables(true);
  await db.undo.put({ key: UNDO_KEY, createdAt: clock.iso(), tables: snapshot, reason: 'delete' } as never);
  await writeTables({}, true);
  // R-ONB-1: אחרי מחיקה מסך הפתיחה מופיע שוב
  await resetOnboarding();
  await clearTestSession();
}

/** כמה רשומות פעילות יש בכל טבלה (תצוגה במסך הגיבוי) */
export async function countRecords(): Promise<Record<DataTableName, number>> {
  const db = getDb();
  const out = {} as Record<DataTableName, number>;
  for (const name of DATA_TABLE_NAMES) {
    const rows = (await db.data(name).toArray()) as { deletedAt?: string | null }[];
    out[name] = rows.filter((r) => !r.deletedAt).length;
  }
  return out;
}

/** "בטל ייבוא": מחזיר בדיוק את המצב שלפני הייבוא */
export async function undoImport(): Promise<void> {
  await assertNotDemo('ביטול ייבוא');
  const db = getDb();
  const row = await db.undo.get(UNDO_KEY);
  if (!row) throw new Error('אין ייבוא לביטול');
  await writeTables(row.tables as Record<string, Row[]>, true);
  await db.undo.delete(UNDO_KEY);
}

/** סגירת אפשרות הביטול (משחרר מקום) */
export async function discardUndoImport(): Promise<void> {
  await getDb().undo.delete(UNDO_KEY);
}

export type { DataTableName };
