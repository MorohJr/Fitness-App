// יומן פציעות (4.2, R-INJ)
import type { Injury } from '../../domain/types';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';

export type InjuryInput = Omit<Injury, keyof import('../../domain/types').BaseRecord>;

export async function listInjuries(): Promise<Injury[]> {
  const rows = (await getDb().data('injuries').toArray()) as Injury[];
  return alive(rows).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function validate(i: InjuryInput): void {
  if (!i.area) throw new Error('בחר אזור');
  if (!(i.pain >= 1 && i.pain <= 10)) throw new Error('עוצמת כאב בין 1 ל-10');
  if (i.status === 'healed' && !i.healedDate) throw new Error('חסר תאריך החלמה');
  if (i.healedDate && i.healedDate < i.startDate) throw new Error('תאריך ההחלמה לפני תאריך ההתחלה');
}

export async function saveInjury(input: InjuryInput, id?: string): Promise<Injury> {
  validate(input);
  const db = getDb();
  if (id) {
    const cur = (await db.data('injuries').get(id)) as Injury | undefined;
    if (!cur) throw new Error('הפציעה לא נמצאה');
    const next = touched(cur, input);
    await db.data('injuries').put(next);
    return next;
  }
  const rec: Injury = { ...newBase(), ...input };
  await db.data('injuries').add(rec);
  return rec;
}

export async function deleteInjury(id: string): Promise<void> {
  const cur = (await getDb().data('injuries').get(id)) as Injury | undefined;
  if (cur) await getDb().data('injuries').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreInjury(id: string): Promise<void> {
  const cur = (await getDb().data('injuries').get(id)) as Injury | undefined;
  if (cur) await getDb().data('injuries').put(touched(cur, { deletedAt: null }));
}
