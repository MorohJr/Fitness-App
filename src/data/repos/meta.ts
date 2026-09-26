// ערכים מקומיים למכשיר (לא בגיבוי)
import { getDb } from '../db';

export type MetaKey = 'firstLaunchAt' | 'lastExportAt' | 'persistRequested';

export async function getMeta<T = unknown>(key: MetaKey): Promise<T | undefined> {
  const row = await getDb().meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await getDb().meta.put({ key, value });
}
