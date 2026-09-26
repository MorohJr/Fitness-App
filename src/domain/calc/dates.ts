// תאריכים לוגיים. יום מתחיל ב-04:00 (מילון מונחים)
import type { ISODate } from '../types';

export const DAY_START_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, '0');

/** התאריך הלוגי של רגע נתון, לפי השעון המקומי */
export function logicalDate(now: Date): ISODate {
  const d = new Date(now.getTime());
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return fromUTC(toUTC(date)) === date;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

/** 0 = ראשון ... 6 = שבת */
export function dayOfWeek(date: ISODate): number {
  return toUTC(date).getUTCDay();
}

/** יום ראשון של השבוע שבו נמצא התאריך */
export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -dayOfWeek(date));
}

/** יום ראשון הבא (אם היום ראשון, זה של השבוע הבא) */
export function nextSunday(date: ISODate): ISODate {
  return addDays(startOfWeek(date), 7);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** גיל בשנים שלמות בתאריך נתון */
export function ageOn(birthDate: ISODate, onDate: ISODate): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

/** תצוגה: 27.09.2026 */
export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
