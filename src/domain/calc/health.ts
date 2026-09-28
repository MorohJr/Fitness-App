// "הדבק מ-Health" (נספח א'): FITAPP;date=2026-09-27;steps=8432;sleep=7.2
import type { ISODate } from '../types';
import { isValidDate } from './dates';

export type HealthParse = { ok: true; steps: number | null; sleep: number | null } | { ok: false; error: string };

export function parseHealthClipboard(text: string, today: ISODate): HealthParse {
  const t = (text ?? '').trim();
  if (!t.startsWith('FITAPP;')) return { ok: false, error: 'הלוח לא מכיל נתונים מקיצור הדרך (צריך להתחיל ב-FITAPP)' };
  const fields: Record<string, string> = {};
  for (const part of t.split(';').slice(1)) {
    const [k, v] = part.split('=');
    if (k && v !== undefined) fields[k.trim()] = v.trim();
  }
  if (!fields.date || !isValidDate(fields.date)) return { ok: false, error: 'חסר תאריך תקין' };
  if (fields.date !== today) return { ok: false, error: `הנתונים מתאריך ${fields.date}, לא של היום. הרץ שוב את קיצור הדרך` };
  const num = (v: string | undefined) => {
    if (v === undefined || v === '') return null;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };
  const steps = num(fields.steps);
  const sleep = num(fields.sleep);
  if (Number.isNaN(steps) || Number.isNaN(sleep)) return { ok: false, error: 'ערך לא תקין בנתונים' };
  if (steps === null && sleep === null) return { ok: false, error: 'אין צעדים ואין שינה בנתונים' };
  if (sleep !== null && sleep > 24) return { ok: false, error: 'שעות שינה לא סבירות' };
  return { ok: true, steps: steps === null ? null : Math.round(steps), sleep: sleep === null ? null : Math.round(sleep * 10) / 10 };
}
