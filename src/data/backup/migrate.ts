// המרת גיבוי מגרסת מבנה ישנה לגרסה הנוכחית (3.5)
import { SCHEMA_VERSION } from '../db';

export interface BackupData {
  app: 'fitness-app';
  schemaVersion: number;
  exportedAt: string;
  includesPhotos: boolean;
  tables: Record<string, Record<string, unknown>[]>;
}

/** מפתח n = המרה מגרסה n לגרסה n+1. כשהסכמה משתנה, מוסיפים כאן המרה */
export type Migrations = Record<number, (data: BackupData) => BackupData>;
export const MIGRATIONS: Migrations = {
  // 1 ← 2: שינוי באינדקס התרגילים בלבד. בגרסה 1 לא היו תרגילים, והמאגר נטען מחדש אחרי הייבוא
  1: (d) => d
};

export function migrateBackup(data: BackupData, migrations: Migrations = MIGRATIONS, target = SCHEMA_VERSION): BackupData {
  if (data.schemaVersion > target) {
    throw new Error('הגיבוי נוצר בגרסה חדשה יותר של האפליקציה. עדכן את האפליקציה ונסה שוב');
  }
  let cur = data;
  while (cur.schemaVersion < target) {
    const step = migrations[cur.schemaVersion];
    if (!step) throw new Error(`אין המרה מגרסה ${cur.schemaVersion}`);
    cur = { ...step(cur), schemaVersion: cur.schemaVersion + 1 };
  }
  return cur;
}
