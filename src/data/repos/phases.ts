// שלבים (4.1)
import type { ISODate, Phase, PhaseInput } from '../../domain/types';
import { phaseEditMode, validateEndDate, validatePhase, type PhaseValidation } from '../../domain/rules/phase';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';
import { refreshToday } from './dayLogs';

export async function listPhases(): Promise<Phase[]> {
  const rows = (await getDb().data('phases').toArray()) as Phase[];
  return alive(rows).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function checkPhase(input: PhaseInput, editingId?: string): Promise<PhaseValidation> {
  return validatePhase(await listPhases(), input, clock.today(), editingId);
}

/** הוספת שלב, או עריכה מלאה של שלב עתידי. סוגר את השלב הקודם אם צריך */
export async function savePhase(input: PhaseInput, editingId?: string): Promise<Phase> {
  const db = getDb();
  const saved = await db.transaction('rw', db.data('phases'), async () => {
    const phases = await listPhases();
    const today = clock.today();
    if (editingId) {
      const cur = phases.find((p) => p.id === editingId);
      if (!cur || phaseEditMode(cur, today) !== 'full') throw new Error('אי אפשר לערוך את השלב הזה');
    }
    const v = validatePhase(phases, input, today, editingId);
    if (v.errors.length) throw new Error(v.errors.join(', '));
    if (v.closes) {
      const prev = phases.find((p) => p.id === v.closes!.id)!;
      await db.data('phases').put(touched(prev, { endDate: v.closes.endDate }));
    }
    if (editingId) {
      const cur = phases.find((p) => p.id === editingId)!;
      const next = touched(cur, input);
      await db.data('phases').put(next);
      return next;
    }
    const rec: Phase = { ...newBase(), ...input };
    await db.data('phases').add(rec);
    return rec;
  });
  await refreshToday();
  return saved;
}

/** תאריך סיום לשלב פעיל (מהיום והלאה) */
export async function setPhaseEnd(id: string, endDate: ISODate | null): Promise<void> {
  const phases = await listPhases();
  const p = phases.find((x) => x.id === id);
  if (!p) throw new Error('השלב לא נמצא');
  const today = clock.today();
  if (phaseEditMode(p, today) === 'none') throw new Error('שלב שהסתיים לא נערך');
  const errors = validateEndDate(p, endDate, today, phases);
  if (errors.length) throw new Error(errors.join(', '));
  await getDb().data('phases').put(touched(p, { endDate }));
  await refreshToday();
}

/** מחיקה רכה, רק לשלב עתידי */
export async function deletePhase(id: string): Promise<void> {
  const p = (await listPhases()).find((x) => x.id === id);
  if (!p) return;
  if (phaseEditMode(p, clock.today()) !== 'full') throw new Error('אפשר למחוק רק שלב עתידי');
  await getDb().data('phases').put(touched(p, { deletedAt: clock.iso() }));
  await refreshToday();
}

/** ביטול מחיקה (הודעת "בטל") */
export async function restorePhase(id: string): Promise<void> {
  const p = (await getDb().data('phases').get(id)) as Phase | undefined;
  if (!p) return;
  await getDb().data('phases').put(touched(p, { deletedAt: null }));
  await refreshToday();
}
