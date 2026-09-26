// R-VER: גרסאות בתוקף
import type { ISODate } from '../types';
import { nextSunday } from '../calc/dates';

interface Versioned {
  id: string;
  effectiveFrom: ISODate;
  deletedAt: string | null;
}

/** R-VER-1: הגרסה האחרונה שתאריך התחלתה לא אחרי התאריך */
export function versionForDate<T extends Versioned>(versions: T[], date: ISODate): T | null {
  let best: T | null = null;
  for (const v of versions) {
    if (v.deletedAt || v.effectiveFrom > date) continue;
    if (!best || v.effectiveFrom > best.effectiveFrom) best = v;
  }
  return best;
}

/** R-VER-2: יעדים חלים מהיום (או ממחר, R-NUT-3) */
export function targetsEffectiveFrom(today: ISODate): ISODate {
  return today;
}

/** R-VER-2: תוכנית שבועית חלה מיום ראשון הבא. אם אין עדיין תוכנית, מהיום */
export function weekPlanEffectiveFrom(today: ISODate, hasVersions: boolean): ISODate {
  return hasVersions ? nextSunday(today) : today;
}

export type VersionPlan = { action: 'create' } | { action: 'replace'; id: string };

/**
 * R-VER-2: שמירת גרסה חדשה. גרסה עם אותו תאריך התחלה מוחלפת.
 * אסור ליצור גרסה שמתחילה בעבר (היא הייתה משנה ימים שעברו, E1).
 */
export function planVersionSave<T extends Versioned>(versions: T[], effectiveFrom: ISODate, today: ISODate): VersionPlan {
  if (effectiveFrom < today) throw new Error('גרסה לא יכולה להתחיל בעבר (E1)');
  const same = versions.find((v) => !v.deletedAt && v.effectiveFrom === effectiveFrom);
  return same ? { action: 'replace', id: same.id } : { action: 'create' };
}

/** R-VER-3: תמונת המצב של יום מתעדכנת רק כל עוד זה היום הנוכחי */
export function snapshotIsLive(date: ISODate, today: ISODate): boolean {
  return date === today;
}
