// יומן יומי. בשלב 1: יעדי היום וסוג היום כתמונת מצב (R-NUT-4, R-VER-3)
import type { DayLog, DayTargets, ISODate, Phase, Profile, TargetVersion, WeekPlanVersion, WeighIn } from '../../domain/types';
import { computeDayTargets } from '../../domain/rules/R-NUT';
import { dayPlanForDate } from '../../domain/rules/R-DAY';
import { snapshotIsLive } from '../../domain/rules/R-VER';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';

/** שקילות בוקר ומדידות עם משקל (למשקל הייחוס) */
export async function listWeighIns(): Promise<WeighIn[]> {
  const db = getDb();
  const logs = alive((await db.data('dayLogs').toArray()) as DayLog[]);
  const measurements = alive((await db.data('bodyMeasurements').toArray()) as { date: ISODate; weightKg?: number | null; deletedAt: string | null }[]);
  const out: WeighIn[] = [];
  for (const l of logs) if (typeof l.morningWeightKg === 'number') out.push({ date: l.date, weightKg: l.morningWeightKg });
  for (const m of measurements) if (typeof m.weightKg === 'number') out.push({ date: m.date, weightKg: m.weightKg });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** יעדי יום מחושבים מהגרסאות שבתוקף באותו יום (R-NUT-4, R-VER-1) */
export async function computeTargetsFor(date: ISODate): Promise<DayTargets> {
  const db = getDb();
  const [targetVersions, phases, weighIns, profiles] = await Promise.all([
    db.data('targetVersions').toArray() as Promise<TargetVersion[]>,
    db.data('phases').toArray() as Promise<Phase[]>,
    listWeighIns(),
    db.data('profile').toArray() as Promise<Profile[]>
  ]);
  const profile = alive(profiles)[0];
  return computeDayTargets({ date, targetVersions, phases, weighIns, manualWeightKg: profile?.manualWeightKg ?? null });
}

export async function getDayLog(date: ISODate): Promise<DayLog | undefined> {
  const row = (await getDb().data('dayLogs').where('date').equals(date).first()) as DayLog | undefined;
  return row && !row.deletedAt ? row : undefined;
}

/**
 * יוצר DayLog לתאריך אם אין. ביום הנוכחי מעדכן את תמונת המצב (R-VER-3).
 * ביום סגור לא נוגע ביעדים.
 */
export async function ensureDayLog(date: ISODate): Promise<DayLog> {
  const db = getDb();
  const existing = await getDayLog(date);
  const live = snapshotIsLive(date, clock.today());
  if (existing && !live) return existing;
  const [targets, plans] = await Promise.all([computeTargetsFor(date), db.data('weekPlanVersions').toArray() as Promise<WeekPlanVersion[]>]);
  const dayType = dayPlanForDate(plans, date).dayType;
  if (existing) {
    const next = touched(existing, { targets, dayType });
    await db.data('dayLogs').put(next);
    return next;
  }
  const rec: DayLog = { ...newBase(), date, dayType, targets };
  await db.data('dayLogs').add(rec);
  return rec;
}

/** מרענן את תמונת המצב של היום אחרי שינוי יעדים/שלבים/תוכנית */
export async function refreshToday(): Promise<DayLog> {
  return ensureDayLog(clock.today());
}

/** יעדי יום לתצוגה: מה-DayLog אם קיים, אחרת חישוב לפי הגרסאות */
export async function getTargetsForDay(date: ISODate): Promise<DayTargets> {
  const log = await getDayLog(date);
  return log ? log.targets : computeTargetsFor(date);
}

export type DayLogPatch = Partial<Pick<DayLog, 'steps' | 'sleepHours' | 'sleepQuality' | 'energy' | 'focus' | 'doms' | 'manualRecovery' | 'waterMl' | 'morningWeightKg' | 'foodComplete'>>;

/** עדכון יומן של יום. גם יום שעבר אפשר לערוך ישירות (E1, החריג) */
export async function updateDayLog(date: ISODate, patch: DayLogPatch): Promise<DayLog> {
  const cur = await ensureDayLog(date);
  const next = touched<DayLog>(cur, patch as Partial<DayLog>);
  await getDb().data('dayLogs').put(next);
  // משקל בוקר משפיע על משקל הייחוס ועל יעדי היום (R-NUT-2)
  if ('morningWeightKg' in patch) await refreshToday();
  return next;
}

/** הוספת שתייה. מחזיר את הכמות הקודמת (לביטול) */
export async function addWater(date: ISODate, ml: number): Promise<number> {
  const cur = await ensureDayLog(date);
  const prev = cur.waterMl ?? 0;
  await getDb().data('dayLogs').put(touched(cur, { waterMl: Math.max(0, prev + ml) }));
  return prev;
}

export async function listDayLogs(): Promise<DayLog[]> {
  return alive((await getDb().data('dayLogs').toArray()) as DayLog[]).sort((a, b) => a.date.localeCompare(b.date));
}
