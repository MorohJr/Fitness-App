// תוכנית שבועית: רשימת גרסאות (4.1, R-VER) ותבניות (4.2)
import type { DayPlan, DayTemplate, ISODate, WeekPlanVersion } from '../../domain/types';
import { DEFAULT_TEMPLATES, dayPlanForDate, validateWeekDays } from '../../domain/rules/R-DAY';
import { planVersionSave, versionForDate, weekPlanEffectiveFrom } from '../../domain/rules/R-VER';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';
import { refreshToday } from './dayLogs';

export async function listTemplates(): Promise<DayTemplate[]> {
  return alive((await getDb().data('dayTemplates').toArray()) as DayTemplate[]);
}

export async function seedTemplatesIfEmpty(): Promise<void> {
  const db = getDb();
  if ((await db.data('dayTemplates').count()) > 0) return;
  const base = newBase();
  await db.data('dayTemplates').bulkAdd(DEFAULT_TEMPLATES.map((t) => ({ ...base, ...structuredClone(t) })));
}

export async function listWeekPlanVersions(): Promise<WeekPlanVersion[]> {
  const rows = (await getDb().data('weekPlanVersions').toArray()) as WeekPlanVersion[];
  return alive(rows).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

export async function getWeekPlanForDate(date: ISODate): Promise<WeekPlanVersion | null> {
  return versionForDate(await listWeekPlanVersions(), date);
}

export async function getDayPlan(date: ISODate): Promise<DayPlan> {
  return dayPlanForDate(await listWeekPlanVersions(), date);
}

/** R-VER-2: שמירה חלה מיום ראשון הבא (או מהיום, אם זו התוכנית הראשונה) */
export async function saveWeekPlan(days: DayPlan[]): Promise<WeekPlanVersion> {
  const errors = validateWeekDays(days, await listTemplates());
  if (errors.length) throw new Error(errors.join(', '));
  const db = getDb();
  const saved = await db.transaction('rw', db.data('weekPlanVersions'), async () => {
    const versions = await listWeekPlanVersions();
    const today = clock.today();
    const effectiveFrom = weekPlanEffectiveFrom(today, versions.length > 0);
    const plan = planVersionSave(versions, effectiveFrom, today);
    const cleanDays = days.map((d) => ({ dayType: d.dayType, templateId: d.templateId }));
    if (plan.action === 'replace') {
      const next = touched(versions.find((v) => v.id === plan.id)!, { days: cleanDays });
      await db.data('weekPlanVersions').put(next);
      return next;
    }
    const rec: WeekPlanVersion = { ...newBase(), effectiveFrom, days: cleanDays };
    await db.data('weekPlanVersions').add(rec);
    return rec;
  });
  await refreshToday();
  return saved;
}

/** ביטול שינוי שעוד לא נכנס לתוקף */
export async function cancelPendingWeekPlan(id: string): Promise<void> {
  const v = (await listWeekPlanVersions()).find((x) => x.id === id);
  if (!v || v.effectiveFrom <= clock.today()) throw new Error('אפשר לבטל רק תוכנית שעוד לא התחילה');
  await getDb().data('weekPlanVersions').put(touched(v, { deletedAt: clock.iso() }));
}
