// הפעלת שכבת הנתונים: ברירות מחדל ותמונת המצב של היום
import { clock } from './clock';
import { getMeta, setMeta } from './repos/meta';
import { ensureProfile } from './repos/profile';
import { addMissingDefaultTemplates, listWeekPlanVersions, seedTemplatesIfEmpty } from './repos/weekPlan';
import { refreshToday } from './repos/dayLogs';
import { DEFAULT_WEEK_DAYS } from '../domain/rules/R-DAY';
import { getDb } from './db';
import { newBase } from './repos/base';
import { seedExercises } from './repos/exercises';
import { upgradeDefaultTemplates, upgradeProfileEquipment } from './upgrades';

export async function initData(): Promise<void> {
  if (!(await getMeta('firstLaunchAt'))) await setMeta('firstLaunchAt', clock.iso());
  await ensureProfile();
  await seedTemplatesIfEmpty();
  await addMissingDefaultTemplates();
  // תוכנית ברירת מחדל (R-DAY-1) חלה מההפעלה הראשונה
  if ((await listWeekPlanVersions()).length === 0) {
    await getDb().data('weekPlanVersions').add({ ...newBase(), effectiveFrom: clock.today(), days: structuredClone(DEFAULT_WEEK_DAYS) });
  }
  // שלב 2: מאגר התרגילים, ועדכוני מבנה לנתונים קיימים
  await upgradeProfileEquipment();
  await upgradeDefaultTemplates();
  await seedExercises();
  await refreshToday();
}
