// ניקוי סופי של רשומות מחוקות אחרי 90 יום (3.3). רץ פעם ביום בפתיחה
import { DATA_TABLE_NAMES, getDb } from './db';
import { clock } from './clock';
import { getMeta, setMeta } from './repos/meta';

export const PURGE_AFTER_DAYS = 90;

export async function purgeDeleted(force = false): Promise<number> {
  const today = clock.today();
  if (!force && (await getMeta<string>('lastPurgeAt')) === today) return 0;
  const cutoff = new Date(clock.now().getTime() - PURGE_AFTER_DAYS * 86_400_000).toISOString();
  const db = getDb();
  let n = 0;
  for (const name of DATA_TABLE_NAMES) {
    const rows = (await db.data(name).toArray()) as { id: string; deletedAt?: string | null }[];
    const old = rows.filter((r) => r.deletedAt && r.deletedAt < cutoff).map((r) => r.id);
    if (old.length) {
      await db.data(name).bulkDelete(old);
      n += old.length;
    }
  }
  await setMeta('lastPurgeAt', today);
  return n;
}
