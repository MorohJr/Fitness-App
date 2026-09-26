// יעדים: רשימת גרסאות (4.1, R-VER)
import type { ISODate, TargetValues, TargetVersion } from '../../domain/types';
import { planVersionSave, targetsEffectiveFrom, versionForDate } from '../../domain/rules/R-VER';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';
import { refreshToday } from './dayLogs';

export async function listTargetVersions(): Promise<TargetVersion[]> {
  const rows = (await getDb().data('targetVersions').toArray()) as TargetVersion[];
  return alive(rows).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

export async function getTargetsForDate(date: ISODate): Promise<TargetVersion | null> {
  return versionForDate(await listTargetVersions(), date);
}

/** R-VER-2: שמירה יוצרת גרסה מהיום (או מתאריך עתידי, למשל מחר ב-R-NUT-3) */
export async function saveTargets(values: TargetValues, effectiveFrom: ISODate = targetsEffectiveFrom(clock.today())): Promise<TargetVersion> {
  const db = getDb();
  const saved = await db.transaction('rw', db.data('targetVersions'), async () => {
    const versions = await listTargetVersions();
    const plan = planVersionSave(versions, effectiveFrom, clock.today());
    if (plan.action === 'replace') {
      const old = versions.find((v) => v.id === plan.id)!;
      const next = touched(old, { ...values, adherence: { ...values.adherence } });
      await db.data('targetVersions').put(next);
      return next;
    }
    const rec: TargetVersion = { ...newBase(), effectiveFrom, ...values, adherence: { ...values.adherence } };
    await db.data('targetVersions').add(rec);
    return rec;
  });
  await refreshToday();
  return saved;
}
