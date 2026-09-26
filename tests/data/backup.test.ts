import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, TARGETS } from './helpers';
import { getDb, DATA_TABLE_NAMES, useFreshDb } from '../../src/data/db';
import { saveTargets } from '../../src/data/repos/targets';
import { savePhase } from '../../src/data/repos/phases';
import { updateProfile } from '../../src/data/repos/profile';
import { exportBackup, hasUndoImport, importBackup, readBackup, undoImport } from '../../src/data/backup/backup';
import { migrateBackup, type BackupData } from '../../src/data/backup/migrate';
import { strToU8, zipSync } from 'fflate';

async function snapshot() {
  const db = getDb();
  const out: Record<string, unknown[]> = {};
  for (const n of DATA_TABLE_NAMES) {
    const rows = (await db.data(n).toArray()) as Record<string, unknown>[];
    out[n] = rows
      .map((r) => (n === 'photos' ? { ...r, blob: r.blob ? 'blob' : null } : r))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  return out;
}

async function addPhoto(id: string, bytes: number[]) {
  await getDb().data('photos').add({ id, photoSetId: 's1', view: 'front', createdAt: 'x', updatedAt: 'x', deletedAt: null, blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }) });
}

async function photoBytes(id: string) {
  const p = await getDb().data('photos').get(id);
  return p ? [...new Uint8Array(await p.blob.arrayBuffer())] : null;
}

beforeEach(async () => {
  await freshApp('2026-09-27');
  await updateProfile({ sex: 'male', heightCm: 180, birthDate: '1990-01-01', manualWeightKg: 80 });
  await saveTargets(TARGETS);
  await savePhase({ type: 'cut', startDate: '2026-10-01', endDate: null, calories: 2100, weeklyRateKg: -0.5 });
});

describe('✅ בדיקת קבלה: ייצוא ← ייבוא במכשיר אחר ← אותם נתונים בדיוק', () => {
  it('כל הטבלאות זהות אחרי ייבוא למסד ריק', async () => {
    await addPhoto('p1', [1, 2, 3]);
    const before = await snapshot();
    const { bytes } = await exportBackup({ includePhotos: true });

    await useFreshDb(); // "המחשב": מסד ריק
    await importBackup(readBackup(bytes));
    expect(await snapshot()).toEqual(before);
    expect(await photoBytes('p1')).toEqual([1, 2, 3]);
  });

  it('הקובץ נקרא ומראה ספירה לפני אישור, בלי לשנות כלום', async () => {
    const { bytes, fileName } = await exportBackup({ includePhotos: false });
    expect(fileName).toBe('fitness-backup-2026-09-27.zip');
    const before = await snapshot();
    const preview = readBackup(bytes);
    expect(preview.counts.phases).toBe(1);
    expect(preview.counts.targetVersions).toBe(1);
    expect(await snapshot()).toEqual(before);
  });
});

describe('✅ בדיקת קבלה: ביטול ייבוא מחזיר את המצב הקודם', () => {
  it('ייבוא ואז ביטול מחזיר בדיוק, כולל תמונות', async () => {
    await addPhoto('p1', [9, 9]);
    const before = await snapshot();
    const mine = await exportBackup({ includePhotos: true });

    // משנים את הקובץ: יעד אחר, בלי שלבים, תמונה אחרת
    const preview = readBackup(mine.bytes);
    const data = structuredClone(preview.data);
    (data.tables.targetVersions[0] as { calories: number }).calories = 1500;
    data.tables.phases = [];
    data.tables.photos = [{ id: 'p2', photoSetId: 's1', view: 'back', createdAt: 'x', updatedAt: 'x', deletedAt: null }];
    await importBackup({ data, photoFiles: { p2: new Uint8Array([5]) }, counts: {} });

    expect(((await getDb().data('targetVersions').toArray())[0] as { calories: number }).calories).toBe(1500);
    expect(await getDb().data('phases').count()).toBe(0);
    expect(await photoBytes('p1')).toBeNull();
    expect(await hasUndoImport()).not.toBeNull();

    await undoImport();
    expect(await snapshot()).toEqual(before);
    expect(await photoBytes('p1')).toEqual([9, 9]);
    expect(await hasUndoImport()).toBeNull();
  });
});

describe('ייבוא: מקרים נוספים (3.5)', () => {
  it('ייבוא בלי תמונות לא מוחק תמונות קיימות', async () => {
    const noPhotos = await exportBackup({ includePhotos: false });
    await addPhoto('p1', [7]);
    await importBackup(readBackup(noPhotos.bytes));
    expect(await photoBytes('p1')).toEqual([7]);
  });

  it('קובץ לא תקין נדחה', () => {
    expect(() => readBackup(new Uint8Array([1, 2, 3]))).toThrow();
    const noData = zipSync({ 'x.txt': strToU8('hi') });
    expect(() => readBackup(noData)).toThrow('data.json');
    const wrongApp = zipSync({ 'data.json': strToU8(JSON.stringify({ app: 'other', schemaVersion: 1, tables: {} })) });
    expect(() => readBackup(wrongApp)).toThrow();
  });

  it('גיבוי מגרסה חדשה יותר נדחה', () => {
    const future = zipSync({ 'data.json': strToU8(JSON.stringify({ app: 'fitness-app', schemaVersion: 99, exportedAt: '', includesPhotos: false, tables: {} })) });
    expect(() => readBackup(future)).toThrow('גרסה חדשה');
  });

  it('המרת גרסה עוברת שלב אחרי שלב', () => {
    const old: BackupData = { app: 'fitness-app', schemaVersion: 1, exportedAt: '', includesPhotos: false, tables: { profile: [{ id: 'a' }] } };
    const migrations = {
      1: (d: BackupData) => ({ ...d, tables: { ...d.tables, profile: d.tables.profile.map((r) => ({ ...r, v2: true })) } }),
      2: (d: BackupData) => ({ ...d, tables: { ...d.tables, profile: d.tables.profile.map((r) => ({ ...r, v3: true })) } })
    };
    const out = migrateBackup(old, migrations, 3);
    expect(out.schemaVersion).toBe(3);
    expect(out.tables.profile[0]).toEqual({ id: 'a', v2: true, v3: true });
    expect(() => migrateBackup(old, {}, 2)).toThrow();
  });
});
