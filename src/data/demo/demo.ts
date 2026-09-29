// מצב הדגמה (R-DEMO): טעינה עם שמירת המצב הקודם, והחזרה אליו
import { DATA_TABLE_NAMES, getDb } from '../db';
import { clock } from '../clock';
import { setMeta } from '../repos/meta';
import { refreshToday } from '../repos/dayLogs';
import { generateDemo, type DemoPhotoSpec } from './generate';
import { DEMO_META_KEY, assertNotDemo } from './state';

export { isDemoMode, assertNotDemo } from './state';

type Row = Record<string, unknown>;
/** המצב שלפני ההדגמה. מפתח נפרד מ"בטל ייבוא", כדי שלא יידרסו זה את זה */
const UNDO_KEY = 'preDemo';
const META_KEY = DEMO_META_KEY;

/** מצייר תמונה לסט תמונות התקדמות (בדפדפן). בבדיקות אין, והתמונות מדולגות */
export type PhotoRenderer = (spec: DemoPhotoSpec) => Promise<Blob | null>;

async function snapshotAll(): Promise<Record<string, Row[]>> {
  const db = getDb();
  const out: Record<string, Row[]> = {};
  for (const name of DATA_TABLE_NAMES) out[name] = (await db.data(name).toArray()) as Row[];
  return out;
}

async function writeAll(tables: Record<string, Row[]>): Promise<void> {
  const db = getDb();
  await db.transaction('rw', DATA_TABLE_NAMES.map((n) => db.data(n)), async () => {
    for (const name of DATA_TABLE_NAMES) {
      await db.data(name).clear();
      const rows = tables[name] ?? [];
      if (rows.length) await db.data(name).bulkAdd(rows);
    }
  });
}

/** R-DEMO-1: שומר את המצב הנוכחי, ומחליף את כל הנתונים בהדגמה */
export async function loadDemo(render?: PhotoRenderer): Promise<{ start: string }> {
  await assertNotDemo('טעינה חוזרת של ההדגמה');
  const db = getDb();
  const demo = generateDemo(clock.today());
  const tables = demo.tables as Record<string, Row[]>;
  if (render) {
    const rows: Row[] = [];
    for (const p of demo.photos) {
      const blob = await render(p);
      if (!blob) continue;
      rows.push({ id: p.id, createdAt: `${p.date}T07:00:00.000Z`, updatedAt: `${p.date}T07:00:00.000Z`, deletedAt: null, photoSetId: p.photoSetId, mealId: null, view: p.view, date: p.date, blob });
    }
    tables.photos = rows;
  }
  // קודם שומרים, ורק אחר כך מחליפים. אם השמירה נכשלת, לא נוגעים בנתונים
  await db.undo.put({ key: UNDO_KEY, createdAt: clock.iso(), tables: await snapshotAll(), reason: 'demo' } as never);
  await writeAll(tables);
  await setMeta(META_KEY, clock.iso());
  await refreshToday();
  return { start: demo.start };
}

/** R-DEMO-4: "החזר את הנתונים שלי" */
export async function exitDemo(): Promise<void> {
  const db = getDb();
  const row = await db.undo.get(UNDO_KEY);
  if (!row) throw new Error('לא נמצא המצב שלפני ההדגמה');
  await writeAll(row.tables as Record<string, Row[]>);
  await db.undo.delete(UNDO_KEY);
  await setMeta(META_KEY, null);
  await refreshToday();
}
