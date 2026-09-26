// סכמת מסד הנתונים (Dexie מעל IndexedDB) והמרות גרסה
import Dexie, { type Table } from 'dexie';

/** גרסת המבנה. עולה בכל שינוי סכמה, ונשמרת בגיבוי (3.5) */
export const SCHEMA_VERSION = 1;
export const DB_NAME = 'fitness-app';

/**
 * טבלאות הנתונים (פרק 4). כולן נכנסות לגיבוי.
 * photos: המידע על התמונה + blob. ב-data.json נשמר בלי ה-blob, והתמונה עצמה ב-photos/
 */
export const DATA_TABLES = {
  profile: '&id',
  targetVersions: '&id, effectiveFrom',
  phases: '&id, startDate',
  weekPlanVersions: '&id, effectiveFrom',
  dayTemplates: '&id',
  exercises: '&id, family',
  workouts: '&id, date',
  workoutExercises: '&id, workoutId, exerciseId',
  setLogs: '&id, workoutExerciseId',
  injuries: '&id, status',
  milestones: '&id',
  suggestions: '&id, status',
  dayLogs: '&id, &date',
  foodLogs: '&id, date',
  supplementLogs: '&id, date',
  pantryItems: '&id, barcode',
  meals: '&id',
  supplements: '&id',
  shoppingItems: '&id',
  bodyMeasurements: '&id, date',
  photoSets: '&id, measurementId',
  photos: '&id, photoSetId'
} as const;

export type DataTableName = keyof typeof DATA_TABLES;
export const DATA_TABLE_NAMES = Object.keys(DATA_TABLES) as DataTableName[];

/** טבלאות מקומיות למכשיר, לא נכנסות לגיבוי */
const LOCAL_TABLES = {
  // מפתח-ערך: תאריך ייצוא אחרון, הפעלה ראשונה וכו'
  meta: '&key',
  // מצב לפני ייבוא, בשביל "בטל ייבוא"
  undo: '&key'
};

export interface MetaRow {
  key: string;
  value: unknown;
}

export class AppDB extends Dexie {
  meta!: Table<MetaRow, string>;
  undo!: Table<{ key: string; createdAt: string; tables: Record<string, unknown[]> }, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({ ...DATA_TABLES, ...LOCAL_TABLES });
    // גרסאות עתידיות: this.version(2).stores({...}).upgrade(tx => ...)
    // ובמקביל המרה מקבילה לגיבויים ב-backup/migrate.ts
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(name: DataTableName): Table<any, string> {
    return this.table(name);
  }
}

let current = new AppDB();

export function getDb(): AppDB {
  return current;
}

/** לבדיקות: מסד חדש ונקי */
export async function useFreshDb(name = `test-${Math.random().toString(36).slice(2)}`): Promise<AppDB> {
  current.close();
  current = new AppDB(name);
  await current.open();
  return current;
}
