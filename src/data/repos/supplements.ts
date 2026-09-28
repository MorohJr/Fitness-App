// תוספים ורישום נטילה (4.3, 4.4)
import type { ISODate, Supplement, SupplementLog } from '../../domain/types';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';

export type SupplementInput = Pick<Supplement, 'name' | 'dose' | 'timing' | 'active'>;

export async function listSupplements(): Promise<Supplement[]> {
  return alive((await getDb().data('supplements').toArray()) as Supplement[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveSupplement(input: SupplementInput, id?: string): Promise<Supplement> {
  if (!input.name.trim()) throw new Error('חסר שם');
  const db = getDb();
  if (id) {
    const cur = (await db.data('supplements').get(id)) as Supplement;
    const next = touched(cur, { ...input, name: input.name.trim() });
    await db.data('supplements').put(next);
    return next;
  }
  const rec: Supplement = { ...newBase(), ...input, name: input.name.trim() };
  await db.data('supplements').add(rec);
  return rec;
}

export async function deleteSupplement(id: string): Promise<void> {
  const cur = (await getDb().data('supplements').get(id)) as Supplement | undefined;
  if (cur) await getDb().data('supplements').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreSupplement(id: string): Promise<void> {
  const cur = (await getDb().data('supplements').get(id)) as Supplement | undefined;
  if (cur) await getDb().data('supplements').put(touched(cur, { deletedAt: null }));
}

export async function listSupplementLogs(date: ISODate): Promise<SupplementLog[]> {
  return alive((await getDb().data('supplementLogs').where('date').equals(date).toArray()) as SupplementLog[]);
}

/** סימון נלקח/לא. השם והמינון נשמרים כתמונת מצב (E1) */
export async function setSupplementTaken(date: ISODate, s: Supplement, taken: boolean): Promise<void> {
  const db = getDb();
  const existing = (await listSupplementLogs(date)).find((l) => l.supplementId === s.id);
  if (existing) {
    await db.data('supplementLogs').put(touched(existing, { taken }));
    return;
  }
  const rec: SupplementLog = { ...newBase(), date, supplementId: s.id, name: s.name, dose: s.dose, taken };
  await db.data('supplementLogs').add(rec);
}
